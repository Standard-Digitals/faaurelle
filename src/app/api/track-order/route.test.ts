import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/delhivery/tracking", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server/delhivery/tracking")>("@/lib/server/delhivery/tracking");
  return { ...actual, trackDelhiveryWaybill: mocks.track };
});

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
    expect((await POST(request({ waybill: "112,113" }))).status).toBe(400);
    expect((await POST(request({ waybill: "1122", email: "a@example.com" }))).status).toBe(400);
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it("returns only the normalized successful model", async () => {
    const tracking = { waybill: "1122345678722", currentStatus: { label: "In transit", carrierStatus: "In Transit", state: "in-transit" }, scans: [] };
    mocks.track.mockResolvedValue(tracking);
    const { POST } = await import("./route");
    const result = await POST(request({ waybill: "1122345678722" }));
    expect(result.status).toBe(200);
    await expect(result.json()).resolves.toEqual({ success: true, tracking });
    expect(mocks.track).toHaveBeenCalledWith("1122345678722");
    expect(result.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps not found distinct from provider outage", async () => {
    const { DelhiveryTrackingError } = await import("@/lib/server/delhivery/tracking");
    const { POST } = await import("./route");
    mocks.track.mockRejectedValueOnce(new DelhiveryTrackingError("not_found"));
    expect((await POST(request({ waybill: "1122345678722" }))).status).toBe(404);
    mocks.track.mockRejectedValueOnce(new DelhiveryTrackingError("authentication"));
    const unavailable = await POST(request({ waybill: "1122345678722" }));
    expect(unavailable.status).toBe(503);
    await expect(unavailable.json()).resolves.toEqual({ success: false, error: "unavailable" });
  });
});
