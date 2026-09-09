import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const validPayload = {
  fullName: "Aanya Sharma",
  email: "aanya@example.com",
  mobileNumber: "9876543210",
  addressLine1: "12 Lotus Road",
  addressLine2: "",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400 064",
};

describe("checkout serviceability orchestration", () => {
  it("does not contact Delhivery for invalid checkout details", async () => {
    const check = vi.fn();
    const { validateCheckoutAndCheckServiceability } = await import("./checkout-serviceability");

    const result = await validateCheckoutAndCheckServiceability(
      "hair-elixir",
      { ...validPayload, pincode: "4000" },
      check,
    );

    expect(result.success).toBe(false);
    expect(check).not.toHaveBeenCalled();
  });

  it("sends the normalized pincode and returns normalized serviceability only", async () => {
    const check = vi.fn().mockResolvedValue({ postalCode: "400064", prepaidServiceable: true });
    const { validateCheckoutAndCheckServiceability } = await import("./checkout-serviceability");

    const result = await validateCheckoutAndCheckServiceability("hair-elixir", validPayload, check);

    expect(check).toHaveBeenCalledWith("400064");
    expect(result).toMatchObject({
      success: true,
      serviceability: { postalCode: "400064", prepaidServiceable: true },
    });
    expect(result).not.toHaveProperty("amount");
    expect(result).not.toHaveProperty("order");
  });

  it("keeps unavailable and unserviceable results distinct", async () => {
    const { validateCheckoutAndCheckServiceability } = await import("./checkout-serviceability");
    const { DelhiveryServiceabilityError } = await import("@/lib/server/delhivery/types");
    const unavailable = vi.fn().mockRejectedValue(new DelhiveryServiceabilityError("network"));
    const unserviceable = vi.fn().mockResolvedValue({
      postalCode: "400064",
      prepaidServiceable: false,
    });

    await expect(
      validateCheckoutAndCheckServiceability("hair-elixir", validPayload, unavailable),
    ).resolves.toMatchObject({ success: true, serviceabilityError: "unavailable" });
    await expect(
      validateCheckoutAndCheckServiceability("hair-elixir", validPayload, unserviceable),
    ).resolves.toMatchObject({
      success: true,
      serviceability: { prepaidServiceable: false },
    });
  });
});
