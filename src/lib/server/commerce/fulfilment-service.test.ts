import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.stubEnv("DELHIVERY_PICKUP_NAME", "Fa Aurelle / The Vamana & Co.");
});

const order = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  status: "PAID",
  paymentStatus: "CAPTURED",
  fulfillmentStatus: "PENDING",
  productCode: "hair-elixir",
  productName: "Hair Elixir Oil-in-Serum",
  quantity: 1,
  totalPaisa: 209_900,
  currency: "INR",
  customerName: "Private Customer",
  customerPhone: "9876543210",
  addressLine1: "12 Private Road",
  addressLine2: null,
  city: "Mumbai",
  state: "Maharashtra",
  postalCode: "400064",
  countryCode: "IN",
};

function fakeStore(orderOverrides: Partial<typeof order> = {}) {
  const currentOrder = { ...order, ...orderOverrides };
  let shipment: Record<string, unknown> | null = null;
  const store = {
    order: {
      findUnique: vi.fn(async () => currentOrder),
      updateMany: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(currentOrder, data);
        return { count: 1 };
      }),
    },
    shipment: {
      findUnique: vi.fn(async () => shipment),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (shipment) throw new Error("unique orderId");
        shipment = { delhiveryWaybill: null, ...data };
        return shipment;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (!shipment || (where.status && shipment.status !== where.status)) return { count: 0 };
        if (where.delhiveryWaybill === null && shipment.delhiveryWaybill !== null) return { count: 0 };
        Object.assign(shipment, data);
        return { count: 1 };
      }),
    },
  };
  return { store, order: currentOrder, shipment: () => shipment };
}

describe("paid-order fulfilment", () => {
  it("creates one prepaid shipment, persists its waybill, and marks fulfilment created", async () => {
    const fake = fakeStore();
    const createShipment = vi.fn().mockResolvedValue({ waybill: "1122345678722" });
    const { fulfilPaidOrder } = await import("./fulfilment-service");
    await expect(fulfilPaidOrder(order.id, { store: fake.store as never, createShipment })).resolves.toEqual({
      status: "created", waybill: "1122345678722", reused: false,
    });
    expect(fake.shipment()).toMatchObject({ status: "CREATED", paymentMode: "PREPAID", delhiveryWaybill: "1122345678722" });
    expect(fake.order.fulfillmentStatus).toBe("CREATED");
  });

  it("reuses an existing waybill without calling the provider", async () => {
    const fake = fakeStore();
    await fake.store.shipment.create({ data: { orderId: order.id, status: "CREATED", paymentMode: "PREPAID", delhiveryOrderReference: "ref", delhiveryWaybill: "1122345678722" } });
    const createShipment = vi.fn();
    const { fulfilPaidOrder } = await import("./fulfilment-service");
    await expect(fulfilPaidOrder(order.id, { store: fake.store as never, createShipment })).resolves.toMatchObject({ status: "created", reused: true });
    expect(createShipment).not.toHaveBeenCalled();
  });

  it.each([
    { status: "AWAITING_PAYMENT", paymentStatus: "AWAITING_PAYMENT" },
    { status: "AWAITING_PAYMENT", paymentStatus: "AUTHORIZED" },
  ])("does not create a shipment for an ineligible payment state", async (state) => {
    const fake = fakeStore(state);
    const createShipment = vi.fn();
    const { fulfilPaidOrder } = await import("./fulfilment-service");
    await expect(fulfilPaidOrder(order.id, { store: fake.store as never, createShipment })).resolves.toEqual({ status: "ineligible", retryable: false });
    expect(createShipment).not.toHaveBeenCalled();
  });

  it("leaves an ambiguous create claimed and reconciles it by reference on retry", async () => {
    const fake = fakeStore();
    const { DelhiveryShipmentError } = await import("@/lib/server/delhivery/shipment");
    const createShipment = vi.fn().mockRejectedValue(new DelhiveryShipmentError("timeout", true));
    const findByReference = vi.fn().mockResolvedValue({ waybill: "1122345678722" });
    const { fulfilPaidOrder } = await import("./fulfilment-service");
    await expect(fulfilPaidOrder(order.id, { store: fake.store as never, createShipment, findByReference })).resolves.toEqual({ status: "pending", retryable: true });
    await expect(fulfilPaidOrder(order.id, { store: fake.store as never, createShipment, findByReference })).resolves.toMatchObject({ status: "created", reused: true });
    expect(createShipment).toHaveBeenCalledTimes(1);
    expect(findByReference).toHaveBeenCalledTimes(1);
  });

  it("marks a definitive provider failure retryable for a later claimed attempt", async () => {
    const fake = fakeStore();
    const { DelhiveryShipmentError } = await import("@/lib/server/delhivery/shipment");
    const createShipment = vi.fn().mockRejectedValue(new DelhiveryShipmentError("definitive", false));
    const { fulfilPaidOrder } = await import("./fulfilment-service");
    await expect(fulfilPaidOrder(order.id, { store: fake.store as never, createShipment })).resolves.toEqual({ status: "failed", retryable: false });
    expect(fake.shipment()).toMatchObject({ status: "FAILED", delhiveryWaybill: null });
    expect(fake.order.fulfillmentStatus).toBe("FAILED");
  });

  it("uses the historical stored order total rather than current catalog pricing", async () => {
    const fake = fakeStore({ totalPaisa: 99_900 });
    const createShipment = vi.fn().mockResolvedValue({ waybill: "1122345678722" });
    const { fulfilPaidOrder } = await import("./fulfilment-service");
    await fulfilPaidOrder(order.id, { store: fake.store as never, createShipment });
    expect(createShipment).toHaveBeenCalledWith(expect.objectContaining({ product: expect.objectContaining({ totalAmountRupees: "999.00" }) }));
  });

  it("declares the stored discounted total without recalculating coupon eligibility", async () => {
    const fake = fakeStore({ totalPaisa: 167_920 });
    const createShipment = vi.fn().mockResolvedValue({ waybill: "1122345678722" });
    const { fulfilPaidOrder } = await import("./fulfilment-service");
    await fulfilPaidOrder(order.id, { store: fake.store as never, createShipment });
    expect(createShipment).toHaveBeenCalledWith(expect.objectContaining({
      product: expect.objectContaining({ totalAmountRupees: "1679.20" }),
    }));
  });

  it("allows only one provider create across concurrent triggers", async () => {
    const fake = fakeStore();
    let release!: () => void;
    const createShipment = vi.fn().mockImplementation(() => new Promise((resolve) => { release = () => resolve({ waybill: "1122345678722" }); }));
    const { fulfilPaidOrder } = await import("./fulfilment-service");
    const first = fulfilPaidOrder(order.id, { store: fake.store as never, createShipment });
    while (createShipment.mock.calls.length === 0) await Promise.resolve();
    const second = await fulfilPaidOrder(order.id, { store: fake.store as never, createShipment, findByReference: vi.fn().mockResolvedValue(null) });
    release();
    await first;
    expect(second).toEqual({ status: "pending", retryable: true });
    expect(createShipment).toHaveBeenCalledTimes(1);
  });
});
