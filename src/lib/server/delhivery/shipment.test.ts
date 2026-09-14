import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const options = {
  apiToken: "provider-token",
  apiBaseUrl: "https://track.delhivery.com",
};

const input = {
  reference: "fa_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  recipient: {
    name: "Private Customer",
    phone: "9876543210",
    address: "12 Private Road",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400064",
    country: "India",
  },
  product: {
    description: "Hair Elixir Oil-in-Serum (hair-elixir)",
    sku: "hair-elixir",
    hsnCode: "33059090",
    quantity: 1,
    totalAmountRupees: "2099.00",
  },
  package: { weightGrams: 150, widthCm: 8, lengthCm: 8, heightCm: 13 },
  seller: {
    name: "Fa Aurelle / The Vamana & Co.",
    address: "1020 Tower No. 5, Southcity Apartments, VIP Road, Zirakpur, Punjab 140603",
    gstin: "04AYUPB0073E1ZS",
  },
  pickup: {
    name: "Fa Aurelle / The Vamana & Co.",
    address: "1020 Tower No. 5, Southcity Apartments, VIP Road, Zirakpur, Punjab 140603",
    city: "Zirakpur",
    pincode: "140603",
    country: "India",
  },
};

describe("Delhivery shipment creation", () => {
  it("posts the documented form payload as prepaid and normalizes the waybill", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ success: true, packages: [{ status: "Success", waybill: "1122345678722" }] }));
    const { createDelhiveryShipment } = await import("./shipment");
    await expect(createDelhiveryShipment(input, { ...options, fetchImpl })).resolves.toEqual({ waybill: "1122345678722" });
    const [url, request] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe("https://track.delhivery.com/api/cmu/create.json");
    expect(request.headers.Authorization).toBe("Token provider-token");
    const form = request.body as URLSearchParams;
    expect(form.get("format")).toBe("json");
    const data = JSON.parse(form.get("data")!);
    expect(data.shipments[0]).toMatchObject({
      order: input.reference,
      payment_mode: "Prepaid",
      total_amount: "2099.00",
      quantity: 1,
      weight: 150,
      shipment_width: 8,
      shipment_length: 8,
      shipment_height: 13,
      hsn_code: "33059090",
      seller_gst_tin: "04AYUPB0073E1ZS",
    });
    expect(data.shipments[0]).not.toHaveProperty("cod_amount");
    expect(data.pickup_location).toEqual({
      name: "Fa Aurelle / The Vamana & Co.",
      add: "1020 Tower No. 5, Southcity Apartments, VIP Road, Zirakpur, Punjab 140603",
      city: "Zirakpur",
      pin: "140603",
      country: "India",
    });
  });

  it("treats a timeout and malformed success as ambiguous", async () => {
    const { createDelhiveryShipment } = await import("./shipment");
    await expect(createDelhiveryShipment(input, {
      ...options,
      fetchImpl: vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")),
    })).rejects.toMatchObject({ kind: "timeout", ambiguous: true });
    await expect(createDelhiveryShipment(input, {
      ...options,
      fetchImpl: vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })),
    })).rejects.toMatchObject({ kind: "malformed_response", ambiguous: true });
  });

  it("preserves sanitized provider rejection details without retaining the raw payload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({
      success: false,
      rmk: "Shipment creation failed",
      packages: [{
        status: "Fail",
        err_code: "ER0005",
        remarks: ["Pickup location does not exist", "Confirm the staging warehouse"],
        refnum: input.reference,
      }],
    }));
    const { createDelhiveryShipment } = await import("./shipment");
    await expect(createDelhiveryShipment(input, { ...options, fetchImpl })).rejects.toMatchObject({
      kind: "definitive",
      ambiguous: false,
      diagnostic: {
        providerMessage: "Pickup location does not exist; Confirm the staging warehouse",
        providerStatus: "Fail",
        providerReference: input.reference,
        providerErrorCode: "ER0005",
      },
    });
  });

  it("looks up an ambiguous creation by deterministic order reference", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ ShipmentData: [{ Shipment: { AWB: "1122345678722" } }] }));
    const { findDelhiveryShipmentByReference } = await import("./shipment");
    await expect(findDelhiveryShipmentByReference(input.reference, { ...options, fetchImpl })).resolves.toEqual({ waybill: "1122345678722" });
    expect(String(fetchImpl.mock.calls[0][0])).toBe(`https://track.delhivery.com/api/v1/packages/json/?ref_ids=${input.reference}`);
  });
});
