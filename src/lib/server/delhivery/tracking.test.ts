import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const configuration = {
  apiToken: "test-token",
  apiBaseUrl: "https://staging-express.delhivery.com",
};

function shipmentPayload(status = "In Transit") {
  return {
    ShipmentData: [{
      Shipment: {
        AWB: "1122345678722",
        Origin: "BLR_Hub (Karnataka)",
        Destination: "Surat",
        PickUpDate: "2026-09-08T10:00:00",
        Consignee: { Name: "Private Customer", Telephone1: ["9999999999"], Address1: ["Private address"] },
        CODAmount: 999,
        Status: {
          Status: status,
          StatusLocation: "Bengaluru_East (Karnataka)",
          StatusDateTime: "2026-09-09T17:13:31",
          StatusType: "UD",
          StatusCode: 101,
        },
        Scans: [
          { ScanDetail: { Scan: status, StatusDateTime: "2026-09-09T17:13:31", ScannedLocation: "Bengaluru_East (Karnataka)", Instructions: "Package dispatched" } },
          { ScanDetail: { Scan: "Picked Up", ScanDateTime: "2026-09-08T10:00:00", ScannedLocation: "BLR_Hub (Karnataka)" } },
          { ScanDetail: { Scan: status, StatusDateTime: "2026-09-09T17:13:31", ScannedLocation: "Bengaluru_East (Karnataka)", Instructions: "Package dispatched" } },
        ],
      },
    }],
  };
}

describe("Delhivery tracking request", () => {
  it("uses the configured base, documented path, one waybill, header authentication, and no-store", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json(shipmentPayload()));
    const { trackDelhiveryWaybill } = await import("./tracking");
    await trackDelhiveryWaybill("1122345678722", { ...configuration, fetchImpl });
    const [url, request] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe("https://staging-express.delhivery.com/api/v1/packages/json/?waybill=1122345678722");
    expect(request).toMatchObject({
      method: "GET",
      headers: { Accept: "application/json", Authorization: "Token test-token" },
      cache: "no-store",
    });
  });

  it("derives the same path from a production-compatible base", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json(shipmentPayload()));
    const { trackDelhiveryWaybill } = await import("./tracking");
    await trackDelhiveryWaybill("1122345678722", { ...configuration, apiBaseUrl: "https://track.delhivery.com", fetchImpl });
    expect(String(fetchImpl.mock.calls[0][0])).toBe("https://track.delhivery.com/api/v1/packages/json/?waybill=1122345678722");
  });

  it.each([[401, "authentication"], [403, "authentication"], [500, "provider"]] as const)("maps HTTP %s to %s", async (status, kind) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("provider body", { status }));
    const { trackDelhiveryWaybill } = await import("./tracking");
    await expect(trackDelhiveryWaybill("1122345678722", { ...configuration, fetchImpl })).rejects.toMatchObject({ kind });
  });

  it("distinguishes timeout and malformed successful responses", async () => {
    const { trackDelhiveryWaybill } = await import("./tracking");
    await expect(trackDelhiveryWaybill("1122345678722", {
      ...configuration,
      fetchImpl: vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")),
    })).rejects.toMatchObject({ kind: "timeout" });
    await expect(trackDelhiveryWaybill("1122345678722", {
      ...configuration,
      fetchImpl: vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })),
    })).rejects.toMatchObject({ kind: "malformed_response" });
  });
});

describe("Delhivery tracking normalization", () => {
  it("normalizes status and chronological unique scans while stripping PII", async () => {
    const { normalizeDelhiveryTracking } = await import("./tracking");
    const result = normalizeDelhiveryTracking(shipmentPayload(), "1122345678722");
    expect(result).toMatchObject({
      waybill: "1122345678722",
      currentStatus: { state: "in-transit", label: "In transit", carrierStatus: "In Transit" },
      origin: "BLR_Hub (Karnataka)",
      destination: "Surat",
    });
    expect(result.scans).toHaveLength(2);
    expect(result.scans.map((scan) => scan.status)).toEqual(["Picked Up", "In Transit"]);
    expect(JSON.stringify(result)).not.toContain("Private Customer");
    expect(JSON.stringify(result)).not.toContain("9999999999");
    expect(JSON.stringify(result)).not.toContain("Private address");
    expect(JSON.stringify(result)).not.toContain("CODAmount");
  });

  it.each([["Delivered", "delivered"], ["RTO", "returned"], ["Carrier custom status", "carrier-update"]] as const)("maps %s safely", async (status, state) => {
    const { normalizeDelhiveryTracking } = await import("./tracking");
    expect(normalizeDelhiveryTracking(shipmentPayload(status), "1122345678722").currentStatus.state).toBe(state);
  });

  it("tolerates missing optional fields and treats empty shipment data as not found", async () => {
    const { normalizeDelhiveryTracking } = await import("./tracking");
    const payload = shipmentPayload();
    delete (payload.ShipmentData[0].Shipment as Partial<typeof payload.ShipmentData[0]["Shipment"]>).Origin;
    delete (payload.ShipmentData[0].Shipment as Partial<typeof payload.ShipmentData[0]["Shipment"]>).Scans;
    expect(normalizeDelhiveryTracking(payload, "1122345678722")).toMatchObject({ scans: [] });
    expect(() => normalizeDelhiveryTracking({ ShipmentData: [] }, "1122345678722")).toThrowError(expect.objectContaining({ kind: "not_found" }));
  });
});
