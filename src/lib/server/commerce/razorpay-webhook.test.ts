import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

function payload(event = "payment.captured") {
  return {
    event,
    payload: {
      payment: { entity: { id: "pay_Payment123", order_id: "order_Order123", status: "failed" } },
      order: { entity: { id: "order_Order123" } },
    },
  };
}

function fakeEvents() {
  const rows = new Map<string, Record<string, unknown>>();
  return {
    rows,
    store: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = String(data.providerEventId);
        if (rows.has(id)) throw new Error("unique providerEventId");
        rows.set(id, { ...data });
      }),
      findUnique: vi.fn(async ({ where }: { where: { providerEventId: string } }) => rows.get(where.providerEventId) ?? null),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const row = rows.get(String(where.providerEventId));
        if (!row) return { count: 0 };
        const state = where.processingStatus;
        if (typeof state === "string" && row.processingStatus !== state) return { count: 0 };
        if (state && typeof state === "object" && !(state as { in: string[] }).in.includes(String(row.processingStatus))) return { count: 0 };
        const lease = where.processingStartedAt as { lt?: Date } | undefined;
        if (lease?.lt && (!(row.processingStartedAt instanceof Date) || row.processingStartedAt >= lease.lt)) return { count: 0 };
        Object.assign(row, data);
        return { count: 1 };
      }),
      update: vi.fn(async ({ where, data }: { where: { providerEventId: string }; data: Record<string, unknown> }) => {
        Object.assign(rows.get(where.providerEventId)!, data);
      }),
    },
  };
}

function dependencies(events: ReturnType<typeof fakeEvents>["store"]) {
  return {
    events,
    findOrder: vi.fn().mockResolvedValue({ id: "internal-order", razorpayOrderId: "order_Order123" }),
    fetchPayment: vi.fn().mockResolvedValue({ id: "pay_Payment123", orderId: "order_Order123", amount: 99_900, currency: "INR", status: "captured", captured: true, createdAt: new Date() }),
    reconcile: vi.fn().mockResolvedValue({ status: "captured" }),
    now: () => new Date("2026-09-09T12:00:00Z"),
  };
}

describe("Razorpay webhook processing", () => {
  it.each(["payment.captured", "payment.failed", "order.paid"])("uses provider fetch and shared reconciliation for %s", async (event) => {
    const fake = fakeEvents();
    const deps = dependencies(fake.store);
    const { processRazorpayWebhook } = await import("./razorpay-webhook");
    await expect(processRazorpayWebhook(`evt_${event.replace(".", "_")}`, payload(event), deps as never)).resolves.toEqual({ outcome: "processed" });
    expect(deps.fetchPayment).toHaveBeenCalledWith("pay_Payment123");
    expect(deps.reconcile).toHaveBeenCalledTimes(1);
  });

  it("deduplicates an already processed event", async () => {
    const fake = fakeEvents();
    const deps = dependencies(fake.store);
    const { processRazorpayWebhook } = await import("./razorpay-webhook");
    await processRazorpayWebhook("evt_duplicate123", payload(), deps as never);
    await expect(processRazorpayWebhook("evt_duplicate123", payload(), deps as never)).resolves.toEqual({ outcome: "duplicate" });
    expect(deps.reconcile).toHaveBeenCalledTimes(1);
  });

  it("allows a failed event to be claimed and retried", async () => {
    const fake = fakeEvents();
    const deps = dependencies(fake.store);
    deps.fetchPayment.mockRejectedValueOnce(new Error("timeout"));
    const { processRazorpayWebhook } = await import("./razorpay-webhook");
    await expect(processRazorpayWebhook("evt_retry123", payload(), deps as never)).rejects.toMatchObject({ retryable: true });
    await expect(processRazorpayWebhook("evt_retry123", payload(), deps as never)).resolves.toEqual({ outcome: "processed" });
    expect(deps.reconcile).toHaveBeenCalledTimes(1);
  });

  it("acknowledges unsupported events and unknown internal orders without business mutation", async () => {
    const fake = fakeEvents();
    const deps = dependencies(fake.store);
    const { processRazorpayWebhook } = await import("./razorpay-webhook");
    await expect(processRazorpayWebhook("evt_unsupported123", payload("payment.authorized"), deps as never)).resolves.toEqual({ outcome: "ignored" });
    deps.findOrder.mockResolvedValueOnce(null);
    await expect(processRazorpayWebhook("evt_unknown123", payload(), deps as never)).resolves.toEqual({ outcome: "ignored" });
    expect(deps.reconcile).not.toHaveBeenCalled();
  });

  it("acknowledges a permanent payment integrity mismatch after recording it", async () => {
    const fake = fakeEvents();
    const deps = dependencies(fake.store);
    const { PaymentIntegrityError } = await import("./payment-service");
    deps.reconcile.mockRejectedValueOnce(new PaymentIntegrityError("amount"));
    const { processRazorpayWebhook } = await import("./razorpay-webhook");
    await expect(processRazorpayWebhook("evt_integrity123", payload(), deps as never)).resolves.toEqual({ outcome: "ignored" });
    expect(fake.rows.get("evt_integrity123")).toMatchObject({
      processingStatus: "PROCESSED",
      errorMessage: "Payment integrity mismatch",
    });
  });

  it("gives one owner to concurrent deliveries of the same event ID", async () => {
    const fake = fakeEvents();
    const deps = dependencies(fake.store);
    let release!: () => void;
    deps.fetchPayment.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ id: "pay_Payment123", orderId: "order_Order123", amount: 99_900, currency: "INR", status: "captured", captured: true, createdAt: new Date() }); }));
    const { processRazorpayWebhook } = await import("./razorpay-webhook");
    const first = processRazorpayWebhook("evt_concurrent123", payload(), deps as never);
    await Promise.resolve();
    const second = await processRazorpayWebhook("evt_concurrent123", payload(), deps as never);
    release();
    await first;
    expect(second).toEqual({ outcome: "in_progress" });
    expect(deps.reconcile).toHaveBeenCalledTimes(1);
  });
});
