import "server-only";
import { prisma } from "@/lib/server/db/prisma";
import { fetchRazorpayPayment } from "@/lib/server/razorpay/client";
import { PaymentIntegrityError, reconcileRazorpayPayment } from "./payment-service";

const SUPPORTED_EVENTS = new Set(["payment.captured", "payment.failed", "order.paid"]);
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
  now?: () => Date;
}>;

export class WebhookProcessingError extends Error {
  constructor(readonly retryable: boolean) {
    super("Razorpay webhook processing failed");
    this.name = "WebhookProcessingError";
  }
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
  const events = dependencies.events ?? (prisma.webhookEvent as unknown as WebhookStore);
  const now = (dependencies.now ?? (() => new Date()))();
  const claim = await claimEvent(eventId, signal, events, now);
  if (claim === "processed") return { outcome: "duplicate" };
  if (claim === "in_progress") return { outcome: "in_progress" };

  if (!SUPPORTED_EVENTS.has(signal.eventType)) {
    await events.update({
      where: { providerEventId: eventId },
      data: { processingStatus: "PROCESSED", processingStartedAt: null, processedAt: now, errorMessage: "Unsupported event ignored" },
    });
    return { outcome: "ignored" };
  }
  if (!signal.paymentId || !signal.orderId) {
    await events.update({
      where: { providerEventId: eventId },
      data: { processingStatus: "PROCESSED", processingStartedAt: null, processedAt: now, errorMessage: "Supported event lacked correlation identifiers" },
    });
    return { outcome: "ignored" };
  }

  const findOrder = dependencies.findOrder ?? prisma.order.findUnique.bind(prisma.order);
  const order = await findOrder({ where: { razorpayOrderId: signal.orderId } });
  if (!order) {
    await events.update({
      where: { providerEventId: eventId },
      data: { processingStatus: "PROCESSED", processingStartedAt: null, processedAt: now, errorMessage: "No matching internal order" },
    });
    return { outcome: "ignored" };
  }

  try {
    const payment = await (dependencies.fetchPayment ?? fetchRazorpayPayment)(signal.paymentId);
    await (dependencies.reconcile ?? reconcileRazorpayPayment)(order, payment, now, signal.paymentId);
    await events.update({
      where: { providerEventId: eventId },
      data: { processingStatus: "PROCESSED", processingStartedAt: null, processedAt: now, errorMessage: null },
    });
    return { outcome: "processed" };
  } catch (error) {
    if (error instanceof PaymentIntegrityError) {
      await events.update({
        where: { providerEventId: eventId },
        data: { processingStatus: "PROCESSED", processingStartedAt: null, processedAt: now, errorMessage: "Payment integrity mismatch" },
      });
      return { outcome: "ignored" };
    }
    await events.update({
      where: { providerEventId: eventId },
      data: { processingStatus: "FAILED", processingStartedAt: null, errorMessage: "Payment reconciliation failed" },
    });
    throw new WebhookProcessingError(true);
  }
}
