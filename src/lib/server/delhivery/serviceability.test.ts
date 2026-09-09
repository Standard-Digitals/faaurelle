import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const response = (prePaid: "Y" | "N", cod: "Y" | "N" = "N", remarks = "") => ({
  delivery_codes: [
    {
      postal_code: {
        city: "Mumbai",
        cod,
        pin: 400064,
        pre_paid: prePaid,
        state_code: "MH",
        remarks,
      },
    },
  ],
});

describe("Delhivery serviceability normalization", () => {
  it("normalizes the documented prepaid-serviceable response", async () => {
    const { normalizeDelhiveryServiceability } = await import("./serviceability");
    expect(normalizeDelhiveryServiceability("400064", response("Y"))).toEqual({
      postalCode: "400064",
      prepaidServiceable: true,
      destination: { city: "Mumbai", stateCode: "MH" },
    });
  });

  it("normalizes prepaid unavailable and does not accept COD-only service", async () => {
    const { normalizeDelhiveryServiceability } = await import("./serviceability");
    expect(normalizeDelhiveryServiceability("400064", response("N", "N")).prepaidServiceable).toBe(false);
    expect(normalizeDelhiveryServiceability("400064", response("N", "Y")).prepaidServiceable).toBe(false);
  });

  it("treats an embargo as unavailable even if prepaid is Y", async () => {
    const { normalizeDelhiveryServiceability } = await import("./serviceability");
    expect(normalizeDelhiveryServiceability("400064", response("Y", "N", "Embargo")).prepaidServiceable).toBe(false);
  });

  it("normalizes an empty delivery list as unavailable", async () => {
    const { normalizeDelhiveryServiceability } = await import("./serviceability");
    expect(normalizeDelhiveryServiceability("400064", { delivery_codes: [] })).toEqual({
      postalCode: "400064",
      prepaidServiceable: false,
    });
  });

  it("rejects a malformed response", async () => {
    const { normalizeDelhiveryServiceability } = await import("./serviceability");
    expect(() => normalizeDelhiveryServiceability("400064", { delivery_codes: [{}] })).toThrow();
  });
});
