import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("Razorpay Checkout signature verification", () => {
  it("accepts a valid HMAC built from the stored order ID and payment ID", async () => {
    const { verifyRazorpayCheckoutSignature } = await import("./signatures");
    const storedOrderId = "order_Stored123";
    const paymentId = "pay_Payment123";
    const signature = createHmac("sha256", "secret").update(`${storedOrderId}|${paymentId}`).digest("hex");
    expect(verifyRazorpayCheckoutSignature(storedOrderId, paymentId, signature, "secret")).toBe(true);
  });

  it("rejects a signature generated with the callback order instead of stored authority", async () => {
    const { verifyRazorpayCheckoutSignature } = await import("./signatures");
    const signature = createHmac("sha256", "secret").update("order_Callback123|pay_Payment123").digest("hex");
    expect(verifyRazorpayCheckoutSignature("order_Stored123", "pay_Payment123", signature, "secret")).toBe(false);
  });

  it.each(["", "abcd", "z".repeat(64)])("safely rejects malformed signature %s", async (signature) => {
    const { verifyRazorpayCheckoutSignature } = await import("./signatures");
    expect(verifyRazorpayCheckoutSignature("order_Stored123", "pay_Payment123", signature, "secret")).toBe(false);
  });
});

describe("Razorpay webhook signature verification", () => {
  it("accepts the HMAC of the exact raw body with the dedicated secret", async () => {
    process.env.RAZORPAY_PAYMENT_MODE = "test";
    const { verifyRazorpayWebhookSignature } = await import("./signatures");
    const rawBody = '{"event":"payment.captured", "payload":{}}';
    const signature = createHmac("sha256", "webhook-secret").update(rawBody).digest("hex");
    expect(verifyRazorpayWebhookSignature(rawBody, signature, "webhook-secret")).toBe(true);
  });

  it("accepts a valid Test Mode webhook signature in a production runtime", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.RAZORPAY_PAYMENT_MODE = "test";
    try {
      const { verifyRazorpayWebhookSignature } = await import("./signatures");
      const rawBody = '{"event":"payment.captured","payload":{}}';
      const signature = createHmac("sha256", "webhook-secret").update(rawBody).digest("hex");
      expect(verifyRazorpayWebhookSignature(rawBody, signature, "webhook-secret")).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it.each(["test", "live"])("accepts valid webhook signatures in explicit %s mode", async (paymentMode) => {
    process.env.RAZORPAY_PAYMENT_MODE = paymentMode;
    const { verifyRazorpayWebhookSignature } = await import("./signatures");
    const rawBody = '{"event":"payment.captured","payload":{}}';
    const signature = createHmac("sha256", "webhook-secret").update(rawBody).digest("hex");
    expect(verifyRazorpayWebhookSignature(rawBody, signature, "webhook-secret")).toBe(true);
  });

  it.each(["TEST", "", "unsupported"])("fails closed for payment mode %j", async (paymentMode) => {
    process.env.RAZORPAY_PAYMENT_MODE = paymentMode;
    const { verifyRazorpayWebhookSignature } = await import("./signatures");
    expect(verifyRazorpayWebhookSignature("{}", "a".repeat(64), "webhook-secret")).toBe(false);
  });

  it("rejects parsed/reserialized content, the wrong secret, and malformed signatures", async () => {
    process.env.RAZORPAY_PAYMENT_MODE = "test";
    const { verifyRazorpayWebhookSignature } = await import("./signatures");
    const rawBody = '{"event":"payment.captured", "payload":{}}';
    const signature = createHmac("sha256", "webhook-secret").update(rawBody).digest("hex");
    const reserialized = JSON.stringify(JSON.parse(rawBody));
    expect(verifyRazorpayWebhookSignature(reserialized, signature, "webhook-secret")).toBe(false);
    expect(verifyRazorpayWebhookSignature(rawBody, signature, "checkout-key-secret")).toBe(false);
    expect(verifyRazorpayWebhookSignature(rawBody, "invalid", "webhook-secret")).toBe(false);
  });
});
