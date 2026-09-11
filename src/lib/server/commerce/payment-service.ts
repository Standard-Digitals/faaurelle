import "server-only";
import type { Order } from "@/generated/prisma/client";
import { prisma } from "@/lib/server/db/prisma";
import type { RazorpayPayment } from "@/lib/server/razorpay/types";

export type DurablePaymentResult = Readonly<{
  status: "captured" | "processing" | "failed";
  paidAt?: string;
}>;

export class PaymentIntegrityError extends Error {
  constructor(readonly kind: "payment_id" | "order_id" | "amount" | "currency" | "ownership") {
    super(`Payment integrity check failed: ${kind}`);
    this.name = "PaymentIntegrityError";
  }
}

type PaymentTransaction = Pick<typeof prisma, "payment" | "order">;
type PaymentDatabase = {
  $transaction<T>(operation: (transaction: PaymentTransaction) => Promise<T>): Promise<T>;
};

function assertProviderFacts(order: Order, payment: RazorpayPayment, expectedPaymentId?: string) {
  if (expectedPaymentId && payment.id !== expectedPaymentId) throw new PaymentIntegrityError("payment_id");
  if (payment.orderId !== order.razorpayOrderId) throw new PaymentIntegrityError("order_id");
  if (payment.amount !== order.totalPaisa) throw new PaymentIntegrityError("amount");
  if (payment.currency !== order.currency) throw new PaymentIntegrityError("currency");
}

function attemptState(payment: RazorpayPayment) {
  if (payment.status === "captured" && payment.captured) return "CAPTURED" as const;
  if (payment.status === "authorized") return "AUTHORIZED" as const;
  if (payment.status === "failed") return "FAILED" as const;
  return "CREATED" as const;
}

function isUniqueConstraintRace(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

export async function reconcileRazorpayPayment(
  order: Order,
  payment: RazorpayPayment,
  signatureVerifiedAt: Date,
  expectedPaymentId?: string,
  database: PaymentDatabase = prisma as unknown as PaymentDatabase,
): Promise<DurablePaymentResult> {
  assertProviderFacts(order, payment, expectedPaymentId);
  const target = attemptState(payment);

  const persist = (): Promise<DurablePaymentResult> => database.$transaction(async (tx) => {
    const persisted = await tx.payment.upsert({
      where: { razorpayPaymentId: payment.id },
      create: {
        orderId: order.id,
        razorpayPaymentId: payment.id,
        razorpayOrderId: payment.orderId,
        status: target,
        amountPaisa: payment.amount,
        currency: payment.currency,
        captured: target === "CAPTURED",
        signatureVerifiedAt,
        providerCreatedAt: payment.createdAt,
      },
      update: {
        signatureVerifiedAt,
        providerCreatedAt: payment.createdAt,
      },
    });
    if (persisted.orderId !== order.id) throw new PaymentIntegrityError("ownership");
    if (
      persisted.razorpayOrderId !== payment.orderId ||
      persisted.amountPaisa !== payment.amount ||
      persisted.currency !== payment.currency
    ) throw new PaymentIntegrityError("ownership");

    if (target === "CAPTURED") {
      await tx.payment.update({
        where: { razorpayPaymentId: payment.id },
        data: { status: "CAPTURED", captured: true },
      });
      await tx.order.updateMany({
        where: { id: order.id, paymentStatus: { not: "CAPTURED" } },
        data: { status: "PAID", paymentStatus: "CAPTURED", paidAt: signatureVerifiedAt },
      });
    } else if (target === "AUTHORIZED") {
      await tx.payment.updateMany({
        where: { razorpayPaymentId: payment.id, status: { in: ["CREATED", "AUTHORIZED"] } },
        data: { status: "AUTHORIZED" },
      });
      await tx.order.updateMany({
        where: { id: order.id, paymentStatus: { in: ["AWAITING_PAYMENT", "AUTHORIZED"] } },
        data: { paymentStatus: "AUTHORIZED" },
      });
    } else if (target === "FAILED") {
      await tx.payment.updateMany({
        where: { razorpayPaymentId: payment.id, status: "CREATED" },
        data: { status: "FAILED" },
      });
    }

    const currentOrder = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
    const currentPayment = await tx.payment.findUniqueOrThrow({ where: { razorpayPaymentId: payment.id } });
    if (currentOrder.paymentStatus === "CAPTURED" || currentPayment.status === "CAPTURED") {
      return { status: "captured", ...(currentOrder.paidAt ? { paidAt: currentOrder.paidAt.toISOString() } : {}) };
    }
    if (currentPayment.status === "FAILED") return { status: "failed" };
    return { status: "processing" };
  });

  try {
    return await persist();
  } catch (error) {
    if (!isUniqueConstraintRace(error)) throw error;
    // Concurrent browser/webhook reconciliation can race on the same unique
    // Razorpay payment. Once the winning transaction commits, one bounded retry
    // follows the normal upsert/ownership checks and converges on that row.
    return persist();
  }
}
