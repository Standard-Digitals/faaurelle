import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getRazorpayKeySecret } from "./client";

const PAYMENT_ID = /^pay_[A-Za-z0-9]{6,64}$/;
const SIGNATURE = /^[a-f0-9]{64}$/i;

function constantTimeHmac(message: string, suppliedSignature: string, secret: string) {
  if (!SIGNATURE.test(suppliedSignature)) return false;
  const expected = createHmac("sha256", secret).update(message).digest();
  const supplied = Buffer.from(suppliedSignature, "hex");
  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}

export function verifyRazorpayCheckoutSignature(
  storedOrderId: string,
  paymentId: string,
  suppliedSignature: string,
  secret = getRazorpayKeySecret(),
): boolean {
  if (!/^order_[A-Za-z0-9]{6,64}$/.test(storedOrderId) || !PAYMENT_ID.test(paymentId) || !SIGNATURE.test(suppliedSignature)) {
    return false;
  }
  return constantTimeHmac(`${storedOrderId}|${paymentId}`, suppliedSignature, secret);
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  suppliedSignature: string,
  secret = process.env.RAZORPAY_WEBHOOK_SECRET,
): boolean {
  if (
    process.env.RAZORPAY_PAYMENT_MODE !== "test" ||
    !secret?.trim()
  ) {
    return false;
  }
  return constantTimeHmac(rawBody, suppliedSignature, secret.trim());
}
