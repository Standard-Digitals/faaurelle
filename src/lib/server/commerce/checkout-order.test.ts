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
    createProviderOrder: vi.fn().mockResolvedValue({ id: "order_test", amount: 99_900, currency: "INR", receipt: "fa_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", status: "created" }),
    findProviderOrder: vi.fn().mockResolvedValue(null),
    publicKey: () => "rzp_test_example",
    randomId: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    randomToken: () => "opaque-public-token-generated-on-server",
  };
}

describe("payable checkout orchestration", () => {
  it("creates one internal order with authoritative pricing before Razorpay", async () => {
    const fake = fakeOrders();
    const deps = dependencies(fake.store);
    const { createPayableCheckout } = await import("./checkout-order");
    const result = await createPayableCheckout({ checkoutKey, productCode: "hair-elixir", quantity: 1, details }, deps as never);
    expect(result).toMatchObject({ success: true, checkout: { amount: 99_900, publicOrderToken: "opaque-public-token-generated-on-server" } });
    expect(fake.store.create).toHaveBeenCalledTimes(1);
    expect(deps.createProviderOrder).toHaveBeenCalledWith(expect.objectContaining({ amount: 99_900, currency: "INR" }));
    expect([...fake.rows.values()][0]).toMatchObject({ unitAmountPaisa: 99_900, shippingPaisa: 0, taxPaisa: 0, totalPaisa: 99_900, quantity: 1 });
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
