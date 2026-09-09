import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("approved V1 pricing", () => {
  it("uses the tax-inclusive ₹999 price with free shipping and no added tax", async () => {
    const { calculateV1Pricing } = await import("./pricing");
    const { v1Product } = await import("./products");
    expect(calculateV1Pricing(v1Product)).toEqual({
      unitAmountPaisa: 99_900,
      quantity: 1,
      subtotalPaisa: 99_900,
      shippingPaisa: 0,
      taxPaisa: 0,
      totalPaisa: 99_900,
      currency: "INR",
    });
  });
});
