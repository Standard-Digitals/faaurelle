import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/server/db/prisma";
import { fetchRazorpayPayment } from "@/lib/server/razorpay/client";
import { RazorpayOrderError } from "@/lib/server/razorpay/types";
import { PaymentIntegrityError, reconcileRazorpayPayment } from "./payment-service";
import { fulfilPaidOrder } from "./fulfilment-service";

const SUPPORTED_EVENTS = new Set(["payment.captured", "payment.failed", "order.paid"]);
const FULFILMENT_EVENT = "payment.captured";
const EVENT_ID = /^[A-Za-z0-9_-]{6,128}$/;
const PAYMENT_ID = /^pay_[A-Za-z0-9]{6,64}$/;
const ORDER_ID = /^order_[A-Za-z0-9]{6,64}$/;
const PROCESSING_LEASE_MS = 30_000;

type WebhookSignal = Readonly<{
  eventType: string;
  paymentId: string | null;
  orderId: string | null;
}>;

export type WebhookProcessingResult = Readonly<{
  outcome: "processed" | "duplicate" | "ignored" | "in_progress";
}>;

type WebhookStore = {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  findUnique(args: { where: { providerEventId: string } }): Promise<{ processingStatus: string } | null>;
  updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  update(args: { where: { providerEventId: string }; data: Record<string, unknown> }): Promise<unknown>;
};

type Dependencies = Readonly<{
  events?: WebhookStore;
  findOrder?: typeof prisma.order.findUnique;
  fetchPayment?: typeof fetchRazorpayPayment;
  reconcile?: typeof reconcileRazorpayPayment;
  fulfil?: typeof fulfilPaidOrder;
  now?: () => Date;
}>;

export class WebhookProcessingError extends Error {
  constructor(readonly retryable: boolean) {
    super("Razorpay webhook processing failed");
    this.name = "WebhookProcessingError";
  }
}

function safeCause(error: unknown) {
  if (!error || typeof error !== "object") return {};
  const value = error as { name?: unknown; code?: unknown; cause?: unknown };
  const nested = value.cause && typeof value.cause === "object" ? value.cause as { code?: unknown } : undefined;
  return {
    ...(typeof value.name === "string" ? { causeName: value.name } : {}),
    ...(typeof value.code === "string"
      ? { causeCode: value.code }
      : typeof nested?.code === "string" ? { causeCode: nested.code } : {}),
  };
}

function logWebhook(
  diagnosticId: string,
  stage: string,
  eventId: string,
  signal: WebhookSignal,
  details: Record<string, unknown> = {},
) {
  const log = details.outcome === "retryable_failure" ? console.error : console.info;
  log("[commerce:razorpay-webhook]", {
    diagnosticId,
    operation: stage,
    eventId,
    eventType: signal.eventType,
    ...(signal.orderId ? { razorpayOrderId: signal.orderId } : {}),
    ...(signal.paymentId ? { razorpayPaymentId: signal.paymentId } : {}),
    ...details,
  });
}

function entity(payload: unknown, name: "payment" | "order") {
  if (!payload || typeof payload !== "object") return null;
  const wrapper = (payload as Record<string, unknown>)[name];
  if (!wrapper || typeof wrapper !== "object") return null;
  const value = (wrapper as Record<string, unknown>).entity;
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

export function extractRazorpayWebhookSignal(payload: unknown): WebhookSignal | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (typeof root.event !== "string") return null;
  const eventPayload = root.payload;
  const payment = entity(eventPayload, "payment");
  const order = entity(eventPayload, "order");
  const paymentId = typeof payment?.id === "string" && PAYMENT_ID.test(payment.id) ? payment.id : null;
  const embeddedOrderId = typeof payment?.order_id === "string" && ORDER_ID.test(payment.order_id) ? payment.order_id : null;
  const orderId = embeddedOrderId ?? (typeof order?.id === "string" && ORDER_ID.test(order.id) ? order.id : null);
  return { eventType: root.event, paymentId, orderId };
}

async function claimEvent(eventId: string, signal: WebhookSignal, events: WebhookStore, now: Date) {
  try {
    await events.create({
      data: {
        providerEventId: eventId,
        eventType: signal.eventType,
        processingStatus: "PROCESSING",
        processingStartedAt: now,
        razorpayOrderId: signal.orderId,
        razorpayPaymentId: signal.paymentId,
        receivedAt: now,
      },
    });
    return "owner" as const;
  } catch (error) {
    const existing = await events.findUnique({ where: { providerEventId: eventId } });
    if (!existing) throw error;
    if (existing.processingStatus === "PROCESSED") return "processed" as const;
    if (existing.processingStatus === "PROCESSING") {
      const reclaimed = await events.updateMany({
        where: {
          providerEventId: eventId,
          processingStatus: "PROCESSING",
          processingStartedAt: { lt: new Date(now.getTime() - PROCESSING_LEASE_MS) },
        },
        data: { processingStartedAt: now, errorMessage: null },
      });
      return reclaimed.count === 1 ? "owner" as const : "in_progress" as const;
    }
    const claimed = await events.updateMany({
      where: { providerEventId: eventId, processingStatus: { in: ["RECEIVED", "FAILED"] } },
      data: { processingStatus: "PROCESSING", processingStartedAt: now, errorMessage: null },
    });
    return claimed.count === 1 ? "owner" as const : "in_progress" as const;
  }
}

export async function processRazorpayWebhook(
  eventId: string,
  payload: unknown,
  dependencies: Dependencies = {},
): Promise<WebhookProcessingResult> {
  if (!EVENT_ID.test(eventId)) throw new WebhookProcessingError(false);
  const signal = extractRazorpayWebhookSignal(payload);
  if (!signal) throw new WebhookProcessingError(false);
  const diagnosticId = randomUUID();
  const events = dependencies.events ?? (prisma.webhookEvent as unknown as WebhookStore);
  const now = (dependencies.now ?? (() => new Date()))();
  const claim = await claimEvent(eventId, signal, events, now);
  if (claim === "processed") {
    logWebhook(diagnosticId, "claim", eventId, signal, { outcome: "duplicate" });
    return { outcome: "duplicate" };
  }
  if (claim === "in_progress") {
    logWebhook(diagnosticId, "claim", eventId, signal, { outcome: "in_progress" });
    return { outcome: "in_progress" };
  }

  if (!SUPPORTED_EVENTS.has(signal.eventType)) {
    await events.update({
      where: { providerEventId: eventId },
      data: { processingStatus: "PROCESSED", processingStartedAt: null, processedAt: now, errorMessage: "Unsupported event ignored" },
    });
    logWebhook(diagnosticId, "filter", eventId, signal, { outcome: "ignored", reason: "unsupported_event" });
    return { outcome: "ignored" };
  }
  if (!signal.paymentId || !signal.orderId) {
    await events.update({
      where: { providerEventId: eventId },
      data: { processingStatus: "PROCESSED", processingStartedAt: null, processedAt: now, errorMessage: "Supported event lacked correlation identifiers" },
    });
    logWebhook(diagnosticId, "correlation", eventId, signal, { outcome: "ignored", reason: "missing_identifiers" });
    return { outcome: "ignored" };
  }

  const findOrder = dependencies.findOrder ?? prisma.order.findUnique.bind(prisma.order);
  const order = await findOrder({ where: { razorpayOrderId: signal.orderId } });
  if (!order) {
    await events.update({
      where: { providerEventId: eventId },
      data: { processingStatus: "PROCESSED", processingStartedAt: null, processedAt: now, errorMessage: "No matching internal order" },
    });
    logWebhook(diagnosticId, "order_lookup", eventId, signal, { outcome: "ignored", reason: "order_not_found" });
    return { outcome: "ignored" };
  }

  let processingStage = "payment_fetch";
  try {
    const payment = await (dependencies.fetchPayment ?? fetchRazorpayPayment)(signal.paymentId);
    processingStage = "payment_reconciliation";
    const reconciliation = await (dependencies.reconcile ?? reconcileRazorpayPayment)(order, payment, now, signal.paymentId);
    if (reconciliation.status === "captured" && signal.eventType === FULFILMENT_EVENT) {
      processingStage = "fulfilment";
      const fulfilment = await (dependencies.fulfil ?? fulfilPaidOrder)(order.id);
      if (fulfilment.status === "pending") {
        logWebhook(diagnosticId, processingStage, eventId, signal, {
          outcome: "retryable_failure",
          internalOrderId: order.id,
          fulfilmentStatus: fulfilment.status,
        });
        throw new WebhookProcessingError(true);
      }
      if (fulfilment.status === "failed") {
        logWebhook(diagnosticId, processingStage, eventId, signal, {
          outcome: "definitive_failure",
          internalOrderId: order.id,
          fulfilmentStatus: fulfilment.status,
        });
      }
    }
    processingStage = "event_finalize";
    await events.update({
      where: { providerEventId: eventId },
      data: { processingStatus: "PROCESSED", processingStartedAt: null, processedAt: now, errorMessage: null },
    });
    logWebhook(diagnosticId, "complete", eventId, signal, {
      outcome: "processed",
      internalOrderId: order.id,
      paymentStatus: reconciliation.status,
    });
    return { outcome: "processed" };
  } catch (error) {
    if (error instanceof PaymentIntegrityError) {
      await events.update({
        where: { providerEventId: eventId },
        data: { processingStatus: "PROCESSED", processingStartedAt: null, processedAt: now, errorMessage: "Payment integrity mismatch" },
      });
      logWebhook(diagnosticId, processingStage, eventId, signal, {
        outcome: "ignored",
        reason: "payment_integrity_mismatch",
        integrityKind: error.kind,
        internalOrderId: order.id,
      });
      return { outcome: "ignored" };
    }
    if (!(error instanceof WebhookProcessingError && processingStage === "fulfilment")) {
      const providerDetails = error instanceof RazorpayOrderError
        ? { kind: error.kind, ...error.diagnostic }
        : { kind: "unexpected", ...safeCause(error) };
      logWebhook(diagnosticId, processingStage, eventId, signal, {
        outcome: "retryable_failure",
        internalOrderId: order.id,
        ...providerDetails,
      });
    }
    await events.update({
      where: { providerEventId: eventId },
      data: { processingStatus: "FAILED", processingStartedAt: null, errorMessage: `Webhook ${processingStage} failed` },
    });
    throw new WebhookProcessingError(true);
  }
}
