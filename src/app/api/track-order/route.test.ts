import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/commerce/order-tracking", () => ({ resolveOrderTracking: mocks.resolve }));

function request(body: unknown) {
  return new Request("http://localhost/api/track-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("track order endpoint", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not call Delhivery for invalid input or extra identifiers", async () => {
    const { POST } = await import("./route");
    expect((await POST(request({ reference: "112,113" }))).status).toBe(400);
    expect((await POST(request({ waybill: "1122", email: "a@example.com" }))).status).toBe(400);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });

  it("accepts only an Aurelle reference and does not expose the carrier identifier", async () => {
    const tracking = {
      waybill: "1122345678722",
      customerEmail: "private@example.com",
      currentStatus: { label: "In transit", carrierStatus: "In Transit", state: "in-transit" },
      scans: [],
    };
    mocks.resolve.mockResolvedValue({ state: "tracking", tracking });
    const { POST } = await import("./route");
    expect((await POST(request({ reference: "1122345678722" }))).status).toBe(400);

    mocks.resolve.mockResolvedValue({
      state: "tracking",
      orderReference: "FA-0123456789ABCDEF0123",
      tracking: {
        currentStatus: tracking.currentStatus,
        scans: [],
      },
    });
    const result = await POST(request({ reference: "fa-0123456789abcdef0123" }));
    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual({
      success: true,
      state: "tracking",
      orderReference: "FA-0123456789ABCDEF0123",
      tracking: {
        currentStatus: tracking.currentStatus,
        scans: [],
      },
    });
    expect(mocks.resolve).toHaveBeenCalledWith("FA-0123456789ABCDEF0123");
    expect(result.headers.get("cache-control")).toBe("no-store");
  });

  it("accepts a normalized Aurelle reference and returns shipment preparation", async () => {
    mocks.resolve.mockResolvedValue({ state: "preparing", orderReference: "FA-0123456789ABCDEF0123" });
    const { POST } = await import("./route");
    const result = await POST(request({ reference: "fa-0123456789abcdef0123" }));

    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual({
      success: true,
      state: "preparing",
      orderReference: "FA-0123456789ABCDEF0123",
    });
    expect(mocks.resolve).toHaveBeenCalledWith("FA-0123456789ABCDEF0123");
  });

  it("returns carrier-pending for a known order whose waybill has no provider record yet", async () => {
    mocks.resolve.mockResolvedValue({ state: "tracking_pending", orderReference: "FA-0123456789ABCDEF0123" });
    const { POST } = await import("./route");
    const result = await POST(request({ reference: "FA-0123456789ABCDEF0123" }));

    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual({
      success: true,
      state: "tracking_pending",
      orderReference: "FA-0123456789ABCDEF0123",
    });
  });

  it("keeps not found distinct from provider outage", async () => {
    const { DelhiveryTrackingError } = await import("@/lib/server/delhivery/tracking");
    const { POST } = await import("./route");
    mocks.resolve.mockResolvedValueOnce({ state: "not_found" });
    expect((await POST(request({ reference: "FA-0123456789ABCDEF0123" }))).status).toBe(404);
    mocks.resolve.mockRejectedValueOnce(new DelhiveryTrackingError("authentication"));
    const unavailable = await POST(request({ reference: "FA-0123456789ABCDEF0123" }));
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toEqual({ success: false, error: "unavailable" });
  });
});
