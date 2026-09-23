import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const checkoutKey = "12345678-1234-4123-8123-123456789012";
const details = {
  fullName: "Aanya Sharma", email: "aanya@example.com", mobileNumber: "9876543210",
  addressLine1: "12 Lotus Road", addressLine2: "", city: "Mumbai",
  state: "Maharashtra", pincode: "400064", amount: 1, totalPaisa: 1,
};

function fakeOrders() {
  const rows = new Map<string, Record<string, unknown>>();
  return {
    rows,
    store: {
      findUnique: vi.fn(async ({ where }: { where: { checkoutKey: string } }) => rows.get(where.checkoutKey) ?? null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (rows.has(String(data.checkoutKey))) throw new Error("unique");
        const row = { ...data, razorpayOrderId: null, paidAt: null, createdAt: new Date(), updatedAt: new Date() };
        rows.set(String(data.checkoutKey), row);
        return row;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const row = [...rows.values()].find((candidate) => candidate.id === where.id && candidate.paymentStatus === where.paymentStatus && candidate.razorpayOrderId === where.razorpayOrderId);
        if (!row) return { count: 0 };
        Object.assign(row, data, { updatedAt: new Date() });
        return { count: 1 };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = [...rows.values()].find((candidate) => candidate.id === where.id);
        if (!row) throw new Error("missing");
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      }),
    },
  };
}

function dependencies(orders: ReturnType<typeof fakeOrders>["store"]) {
  return {
    orders,
    checkServiceability: vi.fn().mockResolvedValue({ postalCode: "400064", prepaidServiceable: true }),
    createProviderOrder: vi.fn(async (input: { amount: number; currency: "INR"; receipt: string }) => ({ id: "order_test", ...input, status: "created" })),
    findProviderOrder: vi.fn().mockResolvedValue(null),
    publicKey: () => "rzp_test_example",
    randomId: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    randomToken: () => "opaque-public-token-generated-on-server",
    randomCustomerReference: () => "FA-0123456789ABCDEF0123",
  };
}

describe("payable checkout orchestration", () => {
  it("creates one internal order with authoritative pricing before Razorpay", async () => {
    const fake = fakeOrders();
    const deps = dependencies(fake.store);
    const { createPayableCheckout } = await import("./checkout-order");
    const result = await createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details }, deps as never);
    expect(result).toMatchObject({ success: true, checkout: { amount: 209_900, publicOrderToken: "opaque-public-token-generated-on-server" } });
    expect(result).not.toHaveProperty("checkout.keySecret");
    expect(result).not.toHaveProperty("checkout.webhookSecret");
    expect(fake.store.create).toHaveBeenCalledTimes(1);
    expect(deps.createProviderOrder).toHaveBeenCalledWith(expect.objectContaining({ amount: 209_900, currency: "INR" }));
    expect([...fake.rows.values()][0]).toMatchObject({
      customerReference: "FA-0123456789ABCDEF0123",
      unitAmountPaisa: 209_900,
      shippingPaisa: 0,
      taxPaisa: 0,
      totalPaisa: 209_900,
      quantity: 1,
    });
  });

  it("stores the coupon snapshot and sends the discounted total to Razorpay", async () => {
    const fake = fakeOrders();
    const deps = {
      ...dependencies(fake.store),
      validateCoupon: vi.fn().mockResolvedValue({ success: true, coupon: { code: "SIMRAN20", discountPercent: 20 } }),
    };
    const { createPayableCheckout } = await import("./checkout-order");
    const result = await createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details, couponCode: " simran20 " }, deps as never);
    expect(result).toMatchObject({ success: true, checkout: { amount: 167_920 } });
    expect([...fake.rows.values()][0]).toMatchObject({
      couponCode: "SIMRAN20",
      subtotalPaisa: 209_900,
      discountPaisa: 41_980,
      totalPaisa: 167_920,
    });
    expect(deps.createProviderOrder).toHaveBeenCalledWith(expect.objectContaining({ amount: 167_920 }));
  });

  it("treats coupon changes and removal as incompatible checkout material", async () => {
    const fake = fakeOrders();
    const deps = {
      ...dependencies(fake.store),
      validateCoupon: vi.fn().mockResolvedValue({ success: true, coupon: { code: "NEW20", discountPercent: 20 } }),
    };
    const { createPayableCheckout } = await import("./checkout-order");
    await createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details, couponCode: "NEW20" }, deps as never);
    await expect(createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details, couponCode: null }, deps as never))
      .resolves.toMatchObject({ success: false, kind: "conflict" });
  });

  it("blocks a previously redeemed coupon before creating either order", async () => {
    const fake = fakeOrders();
    const deps = {
      ...dependencies(fake.store),
      validateCoupon: vi.fn().mockResolvedValue({ success: false, reason: "used" }),
    };
    const { createPayableCheckout } = await import("./checkout-order");
    await expect(createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details, couponCode: "SIMRAN20" }, deps as never))
      .resolves.toEqual({ success: false, kind: "coupon_used", message: "Invalid coupon code. This coupon has already been used." });
    expect(fake.store.create).not.toHaveBeenCalled();
    expect(deps.createProviderOrder).not.toHaveBeenCalled();
  });

  it("reuses the same internal and persisted Razorpay order on duplicate submission", async () => {
    const fake = fakeOrders();
    const deps = dependencies(fake.store);
    const { createPayableCheckout } = await import("./checkout-order");
    await createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details }, deps as never);
    await createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details }, deps as never);
    expect(fake.store.create).toHaveBeenCalledTimes(1);
    expect(deps.createProviderOrder).toHaveBeenCalledTimes(1);
  });

  it("rejects changed material data for the same checkout key", async () => {
    const fake = fakeOrders();
    const deps = dependencies(fake.store);
    const { createPayableCheckout } = await import("./checkout-order");
    await createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details }, deps as never);
    await expect(createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details: { ...details, city: "Pune" } }, deps as never)).resolves.toMatchObject({ success: false, kind: "conflict" });
  });

  it("does not blindly duplicate an ambiguous Razorpay creation", async () => {
    const fake = fakeOrders();
    const deps = dependencies(fake.store);
    const { RazorpayOrderError } = await import("@/lib/server/razorpay/types");
    deps.createProviderOrder.mockRejectedValueOnce(new RazorpayOrderError("timeout"));
    const { createPayableCheckout } = await import("./checkout-order");

    await expect(createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details }, deps as never)).resolves.toMatchObject({ success: false, kind: "payment_pending" });
    await expect(createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details }, deps as never)).resolves.toMatchObject({ success: false, kind: "payment_pending" });

    expect(deps.createProviderOrder).toHaveBeenCalledTimes(1);
    expect(deps.findProviderOrder).toHaveBeenCalledTimes(1);
    expect([...fake.rows.values()][0]).toMatchObject({ paymentStatus: "ORDER_CREATING", razorpayOrderId: null });
  });

  it("blocks unknown products, unserviceable destinations, and carrier outages before writes", async () => {
    const fake = fakeOrders();
    const deps = dependencies(fake.store);
    const { createPayableCheckout } = await import("./checkout-order");
    await expect(createPayableCheckout({ checkoutKey, productCode: "unknown", quantity: 1, details }, deps as never)).resolves.toMatchObject({ success: false, kind: "validation" });
    deps.checkServiceability.mockResolvedValueOnce({ postalCode: "400064", prepaidServiceable: false });
    await expect(createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details }, deps as never)).resolves.toMatchObject({ success: false, kind: "unserviceable" });
    deps.checkServiceability.mockRejectedValueOnce(new Error("offline"));
    await expect(createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details }, deps as never)).resolves.toMatchObject({ success: false, kind: "service_unavailable" });
    expect(fake.store.create).not.toHaveBeenCalled();
    expect(deps.createProviderOrder).not.toHaveBeenCalled();
  });
});

describe("free checkout orchestration (100%-off coupons)", () => {
  function fakeFreeCheckoutDatabase() {
    const redemptions: Array<{ couponCode: string; normalizedEmail: string; normalizedPhone: string; orderId: string }> = [];
    const orders: Record<string, unknown>[] = [];
    const database = {
      $transaction: vi.fn(async (operation: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          order: {
            create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
              const row = { ...data, createdAt: new Date(), updatedAt: new Date() };
              orders.push(row);
              return row;
            }),
          },
          couponRedemption: {
            createMany: vi.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => {
              const row = data[0] as { couponCode: string; normalizedEmail: string; normalizedPhone: string; orderId: string };
              const exists = redemptions.some((existing) =>
                existing.couponCode === row.couponCode &&
                (existing.normalizedEmail === row.normalizedEmail || existing.normalizedPhone === row.normalizedPhone));
              if (!exists) redemptions.push(row);
              return { count: exists ? 0 : 1 };
            }),
            findUnique: vi.fn(async ({ where }: { where: { orderId: string } }) =>
              redemptions.some((row) => row.orderId === where.orderId) ? { id: where.orderId } : null),
          },
        };
        return operation(tx);
      }),
    };
    return { redemptions, orders, database };
  }

  it("bypasses Razorpay for a 100% coupon, responds immediately, and defers fulfilment/email", async () => {
    const fake = fakeOrders();
    const free = fakeFreeCheckoutDatabase();
    const fulfil = vi.fn().mockResolvedValue({ status: "created", waybill: "WB1", reused: false });
    const notify = vi.fn().mockResolvedValue(undefined);
    const deferred: Array<Promise<void>> = [];
    const deps = {
      ...dependencies(fake.store),
      validateCoupon: vi.fn().mockResolvedValue({ success: true, coupon: { code: "FABZJSU4QK", discountPercent: 100, singleUse: true } }),
      freeCheckoutDatabase: free.database,
      fulfil,
      notify,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
      scheduleAfterResponse: (task: () => Promise<void>) => { deferred.push(task()); },
    };
    const { createPayableCheckout } = await import("./checkout-order");
    const result = await createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details, couponCode: "FABZJSU4QK" }, deps as never);
    expect(result).toEqual({ success: true, free: true, checkout: { publicOrderToken: "opaque-public-token-generated-on-server" } });
    // Fulfilment/email must not block the response: they're queued via scheduleAfterResponse, not awaited inline.
    expect(fulfil).not.toHaveBeenCalled();
    expect(deps.createProviderOrder).not.toHaveBeenCalled();
    expect(fake.store.create).not.toHaveBeenCalled();
    expect(free.orders[0]).toMatchObject({ status: "PAID", paymentStatus: "CAPTURED", totalPaisa: 0, couponCode: "FABZJSU4QK" });
    expect(free.redemptions).toEqual([expect.objectContaining({ couponCode: "FABZJSU4QK", normalizedEmail: "__single_use__", normalizedPhone: "__single_use__" })]);
    await Promise.all(deferred);
    expect(fulfil).toHaveBeenCalledWith("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(notify).toHaveBeenCalledWith("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("rejects the second concurrent redemption of the same singleUse coupon", async () => {
    const free = fakeFreeCheckoutDatabase();
    const coupon = { success: true as const, coupon: { code: "FAFTXBUPCC", discountPercent: 100, singleUse: true } };
    const { createPayableCheckout } = await import("./checkout-order");
    const noopSchedule = (task: () => Promise<void>) => { void task(); };

    const firstOrders = fakeOrders();
    const firstResult = await createPayableCheckout(
      { checkoutKey: "12345678-1234-4123-8123-111111111111", productCode: "hair-elixir", quantity: 1, details, couponCode: "FAFTXBUPCC" },
      {
        ...dependencies(firstOrders.store), validateCoupon: vi.fn().mockResolvedValue(coupon), freeCheckoutDatabase: free.database,
        fulfil: vi.fn().mockResolvedValue({ status: "created", waybill: "WB1", reused: false }), notify: vi.fn(),
        randomId: () => "aaaaaaaa-aaaa-4aaa-8aaa-000000000001",
        scheduleAfterResponse: noopSchedule,
      } as never,
    );
    expect(firstResult).toMatchObject({ success: true, free: true });

    const secondOrders = fakeOrders();
    const secondResult = await createPayableCheckout(
      { checkoutKey: "12345678-1234-4123-8123-222222222222", productCode: "hair-elixir", quantity: 1, details: { ...details, email: "someoneelse@example.com", mobileNumber: "9123456789" }, couponCode: "FAFTXBUPCC" },
      {
        ...dependencies(secondOrders.store), validateCoupon: vi.fn().mockResolvedValue(coupon), freeCheckoutDatabase: free.database,
        fulfil: vi.fn(), notify: vi.fn(),
        randomId: () => "aaaaaaaa-aaaa-4aaa-8aaa-000000000002",
        scheduleAfterResponse: noopSchedule,
      } as never,
    );
    expect(secondResult).toEqual({ success: false, kind: "coupon_used", message: "Invalid coupon code. This coupon has already been used." });
    expect([...secondOrders.rows.values()]).toHaveLength(0);
  });
});
