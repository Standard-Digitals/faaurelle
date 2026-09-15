import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const reference = "FA-0123456789ABCDEF0123";
const tracking = {
  waybill: "1122345678722",
  currentStatus: { label: "Shipment created", carrierStatus: "Manifested", state: "shipment-created" },
  scans: [],
};

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    findOrder: vi.fn().mockResolvedValue({
      customerReference: reference,
      status: "PAID",
      paymentStatus: "CAPTURED",
      shipment: { delhiveryWaybill: tracking.waybill },
    }),
    trackWaybill: vi.fn().mockResolvedValue(tracking),
    ...overrides,
  };
}

describe("Aurelle order tracking resolution", () => {
  it("resolves the exact unique reference to its stored waybill and reuses Stage A", async () => {
    const deps = dependencies();
    const { resolveOrderTracking } = await import("./order-tracking");

    await expect(resolveOrderTracking(reference, deps as never)).resolves.toEqual({
      state: "tracking",
      orderReference: reference,
      tracking: {
        currentStatus: tracking.currentStatus,
        scans: [],
      },
    });
    expect(deps.findOrder).toHaveBeenCalledWith(reference);
    expect(deps.trackWaybill).toHaveBeenCalledWith(tracking.waybill);
  });

  it.each([
    { shipment: null, description: "absent shipment" },
    { shipment: { delhiveryWaybill: null }, description: "shipment without waybill" },
  ])("returns processing and avoids Delhivery for $description", async ({ shipment }) => {
    const deps = dependencies({
      findOrder: vi.fn().mockResolvedValue({
        customerReference: reference,
        status: "PAID",
        paymentStatus: "CAPTURED",
        shipment,
      }),
    });
    const { resolveOrderTracking } = await import("./order-tracking");

    await expect(resolveOrderTracking(reference, deps as never)).resolves.toEqual({
      state: "preparing",
      orderReference: reference,
    });
    expect(deps.trackWaybill).not.toHaveBeenCalled();
  });

  it("returns generic not-found for unknown or uncaptured orders without provider access", async () => {
    const findOrder = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ customerReference: reference, status: "AWAITING_PAYMENT", paymentStatus: "AUTHORIZED", shipment: null });
    const deps = dependencies({ findOrder });
    const { resolveOrderTracking } = await import("./order-tracking");

    await expect(resolveOrderTracking(reference, deps as never)).resolves.toEqual({ state: "not_found" });
    await expect(resolveOrderTracking(reference, deps as never)).resolves.toEqual({ state: "not_found" });
    expect(deps.trackWaybill).not.toHaveBeenCalled();
  });

  it("keeps a known order customer-safe when Delhivery has not ingested its waybill yet", async () => {
    const { DelhiveryTrackingError } = await import("@/lib/server/delhivery/tracking");
    const deps = dependencies({
      trackWaybill: vi.fn().mockRejectedValue(new DelhiveryTrackingError("not_found")),
    });
    const { resolveOrderTracking } = await import("./order-tracking");

    await expect(resolveOrderTracking(reference, deps as never)).resolves.toEqual({
      state: "tracking_pending",
      orderReference: reference,
    });
  });

  it("returns only tracking-safe fields and exposes no mutable store dependency", async () => {
    const deps = dependencies();
    const { resolveOrderTracking } = await import("./order-tracking");
    const result = await resolveOrderTracking(reference, deps as never);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("customerEmail");
    expect(serialized).not.toContain("customerPhone");
    expect(serialized).not.toContain("addressLine1");
    expect(serialized).not.toContain("razorpay");
    expect(serialized).not.toContain(tracking.waybill);
    expect(Object.keys(deps)).toEqual(expect.arrayContaining(["findOrder", "trackWaybill"]));
  });
});
