import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("approved V1 pricing", () => {
  it("uses the tax-inclusive ₹2,099 price with free shipping and no added tax", async () => {
    const { calculateV1Pricing } = await import("./pricing");
    const { v1Product } = await import("./products");
    expect(calculateV1Pricing(v1Product)).toEqual({
      unitAmountPaisa: 209_900,
      quantity: 1,
      subtotalPaisa: 209_900,
      discountPaisa: 0,
      shippingPaisa: 0,
      taxPaisa: 0,
      totalPaisa: 209_900,
      currency: "INR",
    });
  });

  it("applies twenty percent to the whole subtotal using integer paise", async () => {
    const { calculateV1Pricing } = await import("./pricing");
    const { v1Product } = await import("./products");
    expect(calculateV1Pricing(v1Product, 20)).toMatchObject({
      quantity: 1,
      subtotalPaisa: 209_900,
      discountPaisa: 41_980,
      shippingPaisa: 0,
      taxPaisa: 0,
      totalPaisa: 167_920,
    });
  });
});
