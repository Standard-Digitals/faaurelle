import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const order = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  razorpayOrderId: "order_Order123",
  totalPaisa: 99_900,
  currency: "INR",
  status: "AWAITING_PAYMENT",
  paymentStatus: "AWAITING_PAYMENT",
  paidAt: null,
};
const providerPayment = {
  id: "pay_Payment123",
  orderId: "order_Order123",
  amount: 99_900,
  currency: "INR" as const,
  status: "captured" as const,
  captured: true,
  createdAt: new Date("2026-09-09T10:00:00Z"),
};

function fakeDatabase() {
  let payment: Record<string, unknown> | null = null;
  const currentOrder = { ...order };
  const tx = {
    payment: {
      upsert: vi.fn(async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        payment = payment ? { ...payment, ...update } : { id: "payment-row", ...create };
        return payment;
      }),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => payment = { ...payment, ...data }),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (!payment || (where.status === "CREATED" && payment.status !== "CREATED")) return { count: 0 };
        if (where.status && typeof where.status === "object" && !((where.status as { in: string[] }).in.includes(String(payment.status)))) return { count: 0 };
        payment = { ...payment, ...data };
        return { count: 1 };
      }),
      findUniqueOrThrow: vi.fn(async () => payment),
    },
    order: {
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const statusRule = where.paymentStatus as { not?: string; in?: string[] };
        if (statusRule.not === currentOrder.paymentStatus || (statusRule.in && !statusRule.in.includes(currentOrder.paymentStatus))) return { count: 0 };
        Object.assign(currentOrder, data);
        return { count: 1 };
      }),
      findUniqueOrThrow: vi.fn(async () => currentOrder),
    },
  };
  return {
    tx,
    database: { $transaction: vi.fn(async (operation: (value: typeof tx) => Promise<unknown>) => operation(tx)) },
    payment: () => payment,
    order: currentOrder,
  };
}

describe("durable payment reconciliation", () => {
  it("converges after one concurrent unique-constraint race", async () => {
    const fake = fakeDatabase();
    const transaction = fake.database.$transaction;
    transaction.mockRejectedValueOnce({ code: "P2002" });
    const { reconcileRazorpayPayment } = await import("./payment-service");
    await expect(reconcileRazorpayPayment(order as never, providerPayment, new Date(), providerPayment.id, fake.database as never)).resolves.toMatchObject({ status: "captured" });
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("creates one captured attempt and atomically marks the Order paid", async () => {
    const fake = fakeDatabase();
    const { reconcileRazorpayPayment } = await import("./payment-service");
    const paidAt = new Date("2026-09-09T11:00:00Z");
    await expect(reconcileRazorpayPayment(order as never, providerPayment, paidAt, providerPayment.id, fake.database as never)).resolves.toMatchObject({ status: "captured", paidAt: paidAt.toISOString() });
    expect(fake.payment()).toMatchObject({ razorpayPaymentId: providerPayment.id, orderId: order.id, status: "CAPTURED", captured: true });
    expect(fake.order).toMatchObject({ status: "PAID", paymentStatus: "CAPTURED", paidAt });
  });

  it("keeps paidAt stable and does not regress captured state", async () => {
    const fake = fakeDatabase();
    const { reconcileRazorpayPayment } = await import("./payment-service");
    const first = new Date("2026-09-09T11:00:00Z");
    await reconcileRazorpayPayment(order as never, providerPayment, first, providerPayment.id, fake.database as never);
    await reconcileRazorpayPayment(order as never, { ...providerPayment, status: "authorized", captured: false }, new Date("2026-09-09T12:00:00Z"), providerPayment.id, fake.database as never);
    expect(fake.payment()).toMatchObject({ status: "CAPTURED", captured: true });
    expect(fake.order).toMatchObject({ status: "PAID", paymentStatus: "CAPTURED", paidAt: first });
  });

  it.each(["authorized", "failed"] as const)("persists %s without marking the Order paid", async (status) => {
    const fake = fakeDatabase();
    const { reconcileRazorpayPayment } = await import("./payment-service");
    const result = await reconcileRazorpayPayment(order as never, { ...providerPayment, status, captured: false }, new Date(), providerPayment.id, fake.database as never);
    expect(result.status).toBe(status === "failed" ? "failed" : "processing");
    expect(fake.order.status).toBe("AWAITING_PAYMENT");
    expect(fake.order.paidAt).toBeNull();
  });

  it.each([
    ["amount", { amount: 1 }],
    ["currency", { currency: "USD" }],
    ["order_id", { orderId: "order_Different123" }],
    ["payment_id", { id: "pay_Different123" }],
  ])("rejects %s mismatch", async (kind, change) => {
    const fake = fakeDatabase();
    const { reconcileRazorpayPayment } = await import("./payment-service");
    await expect(reconcileRazorpayPayment(order as never, { ...providerPayment, ...change } as never, new Date(), providerPayment.id, fake.database as never)).rejects.toMatchObject({ kind });
  });

  it("rejects a payment ID already attached to another internal Order", async () => {
    const fake = fakeDatabase();
    const { reconcileRazorpayPayment } = await import("./payment-service");
    await reconcileRazorpayPayment(order as never, providerPayment, new Date(), providerPayment.id, fake.database as never);
    await expect(reconcileRazorpayPayment({ ...order, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" } as never, providerPayment, new Date(), providerPayment.id, fake.database as never)).rejects.toMatchObject({ kind: "ownership" });
  });
});
