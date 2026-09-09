import "server-only";
import { prisma } from "@/lib/server/db/prisma";
import { fetchRazorpayPayment } from "@/lib/server/razorpay/client";
import { verifyRazorpayCheckoutSignature } from "@/lib/server/razorpay/signatures";
import { RazorpayOrderError } from "@/lib/server/razorpay/types";
import { PaymentIntegrityError, reconcileRazorpayPayment, type DurablePaymentResult } from "./payment-service";

const PUBLIC_TOKEN = /^[A-Za-z0-9_-]{32,128}$/;
const PAYMENT_ID = /^pay_[A-Za-z0-9]{6,64}$/;
const ORDER_ID = /^order_[A-Za-z0-9]{6,64}$/;
const SIGNATURE = /^[a-f0-9]{64}$/i;

export type PaymentVerificationInput = Readonly<{
  publicOrderToken: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}>;

export type PaymentVerificationResponse =
  | { success: true; payment: DurablePaymentResult }
  | {
      success: false;
      kind: "invalid_request" | "not_found" | "conflict" | "invalid_signature" | "payment_not_found" | "integrity" | "provider_unavailable";
      retryable: boolean;
      message: string;
    };

type Dependencies = Readonly<{
  findOrder?: typeof prisma.order.findUnique;
  verifySignature?: typeof verifyRazorpayCheckoutSignature;
  fetchPayment?: typeof fetchRazorpayPayment;
  reconcile?: typeof reconcileRazorpayPayment;
  now?: () => Date;
}>;

export async function verifyCheckoutPayment(
  input: PaymentVerificationInput,
  dependencies: Dependencies = {},
): Promise<PaymentVerificationResponse> {
  if (
    !input || typeof input !== "object" ||
    !PUBLIC_TOKEN.test(input.publicOrderToken) ||
    !PAYMENT_ID.test(input.razorpay_payment_id) ||
    !ORDER_ID.test(input.razorpay_order_id) ||
    !SIGNATURE.test(input.razorpay_signature)
  ) {
    return { success: false, kind: "invalid_request", retryable: false, message: "The payment response is invalid." };
  }

  const findOrder = dependencies.findOrder ?? prisma.order.findUnique.bind(prisma.order);
  const order = await findOrder({ where: { publicToken: input.publicOrderToken } });
  if (!order || !order.razorpayOrderId) {
    return { success: false, kind: "not_found", retryable: false, message: "The payment could not be matched to this checkout." };
  }
  if (!["AWAITING_PAYMENT", "PAID"].includes(order.status) || !["AWAITING_PAYMENT", "AUTHORIZED", "CAPTURED"].includes(order.paymentStatus)) {
    return { success: false, kind: "conflict", retryable: false, message: "This order cannot accept that payment response." };
  }
  if (input.razorpay_order_id !== order.razorpayOrderId) {
    return { success: false, kind: "conflict", retryable: false, message: "The payment could not be matched to this checkout." };
  }

  let signatureValid = false;
  try {
    signatureValid = (dependencies.verifySignature ?? verifyRazorpayCheckoutSignature)(
      order.razorpayOrderId,
      input.razorpay_payment_id,
      input.razorpay_signature,
    );
  } catch {
    return { success: false, kind: "provider_unavailable", retryable: true, message: "Payment verification is temporarily unavailable." };
  }
  if (!signatureValid) {
    return { success: false, kind: "invalid_signature", retryable: false, message: "The payment response could not be authenticated." };
  }

  let providerPayment;
  try {
    providerPayment = await (dependencies.fetchPayment ?? fetchRazorpayPayment)(input.razorpay_payment_id);
  } catch (error) {
    if (error instanceof RazorpayOrderError && error.kind === "definitive") {
      return { success: false, kind: "payment_not_found", retryable: true, message: "Razorpay has not returned this payment yet. Please retry verification shortly." };
    }
    return { success: false, kind: "provider_unavailable", retryable: true, message: "Razorpay is temporarily unavailable. Your payment has not been marked failed." };
  }

  try {
    const payment = await (dependencies.reconcile ?? reconcileRazorpayPayment)(
      order,
      providerPayment,
      (dependencies.now ?? (() => new Date()))(),
      input.razorpay_payment_id,
    );
    return { success: true, payment };
  } catch (error) {
    if (error instanceof PaymentIntegrityError) {
      return { success: false, kind: "integrity", retryable: false, message: "The provider payment does not match this order." };
    }
    throw error;
  }
}
