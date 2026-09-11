import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const callback = {
  publicOrderToken: "opaque_public_token_12345678901234567890",
  razorpay_payment_id: "pay_Payment123",
  razorpay_order_id: "order_Order123",
  razorpay_signature: "a".repeat(64),
};
const order = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  publicToken: callback.publicOrderToken,
  razorpayOrderId: callback.razorpay_order_id,
  status: "AWAITING_PAYMENT",
  paymentStatus: "AWAITING_PAYMENT",
  totalPaisa: 99_900,
  currency: "INR",
};
const payment = {
  id: callback.razorpay_payment_id,
  orderId: callback.razorpay_order_id,
  amount: 99_900,
  currency: "INR",
  status: "captured",
  captured: true,
  createdAt: new Date(),
};

function dependencies() {
  return {
    findOrder: vi.fn().mockResolvedValue(order),
    verifySignature: vi.fn().mockReturnValue(true),
    fetchPayment: vi.fn().mockResolvedValue(payment),
    reconcile: vi.fn().mockResolvedValue({ status: "captured" }),
    fulfil: vi.fn().mockResolvedValue({ status: "created", waybill: "1122345678722", reused: false }),
  };
}

describe("Checkout payment verification", () => {
  it("rejects callback order mismatch before signature or provider access", async () => {
    const deps = dependencies();
    const { verifyCheckoutPayment } = await import("./payment-verification");
    await expect(verifyCheckoutPayment({ ...callback, razorpay_order_id: "order_Different123" }, deps as never)).resolves.toMatchObject({ success: false, kind: "conflict" });
    expect(deps.verifySignature).not.toHaveBeenCalled();
    expect(deps.fetchPayment).not.toHaveBeenCalled();
  });

  it("rejects invalid signatures without fetching payment", async () => {
    const deps = dependencies();
    deps.verifySignature.mockReturnValue(false);
    const { verifyCheckoutPayment } = await import("./payment-verification");
    await expect(verifyCheckoutPayment(callback, deps as never)).resolves.toMatchObject({ success: false, kind: "invalid_signature" });
    expect(deps.fetchPayment).not.toHaveBeenCalled();
  });

  it("uses the stored order ID for HMAC then reconciles fetched provider truth", async () => {
    const deps = dependencies();
    const { verifyCheckoutPayment } = await import("./payment-verification");
    await expect(verifyCheckoutPayment(callback, deps as never)).resolves.toMatchObject({ success: true, payment: { status: "captured" } });
    expect(deps.verifySignature).toHaveBeenCalledWith(order.razorpayOrderId, callback.razorpay_payment_id, callback.razorpay_signature);
    expect(deps.fetchPayment).toHaveBeenCalledWith(callback.razorpay_payment_id);
    expect(deps.reconcile).toHaveBeenCalledWith(expect.objectContaining({ id: order.id }), payment, expect.any(Date), callback.razorpay_payment_id);
    expect(deps.fulfil).toHaveBeenCalledWith(order.id);
  });

  it("keeps captured payment successful when fulfilment remains pending", async () => {
    const deps = dependencies();
    deps.fulfil.mockResolvedValueOnce({ status: "pending", retryable: true });
    const { verifyCheckoutPayment } = await import("./payment-verification");
    await expect(verifyCheckoutPayment(callback, deps as never)).resolves.toMatchObject({
      success: true,
      payment: { status: "captured" },
      fulfilment: { status: "pending" },
    });
  });

  it("keeps provider unavailability retryable", async () => {
    const deps = dependencies();
    deps.fetchPayment.mockRejectedValue(new Error("network"));
    const { verifyCheckoutPayment } = await import("./payment-verification");
    await expect(verifyCheckoutPayment(callback, deps as never)).resolves.toMatchObject({ success: false, kind: "provider_unavailable", retryable: true });
  });
});
