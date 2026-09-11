import { describe, expect, it, vi } from "vitest";
import { product } from "@/config/product";
import { productShowcase } from "@/components/product-showcase/product-showcase.data";
import {
  assertPaise,
  calculateSubtotal,
  calculateTotal,
  formatInr,
} from "./money";

vi.mock("server-only", () => ({}));

describe("V1 product pricing", () => {
  it("defines the authoritative product price as 209900 paise", async () => {
    const { getAuthoritativeProduct } = await import("@/lib/server/commerce/products");
    expect(getAuthoritativeProduct(product.code)?.unitAmountPaisa).toBe(209_900);
  });

  it("derives display formatting from the canonical numeric price", () => {
    expect(Object.isFrozen(product)).toBe(true);
    expect(productShowcase.price).toBe(formatInr(product.unitAmountPaisa));
    expect(productShowcase.price).toBe("₹2,099");
  });
});

describe("integer INR money", () => {
  it("calculates a quantity-one subtotal", () => {
    expect(calculateSubtotal(99_900, 1)).toBe(99_900);
  });

  it("multiplies quantities using integer paise", () => {
    expect(calculateSubtotal(99_900, 3)).toBe(299_700);
  });

  it.each([-1, 0])("rejects quantity %s", (quantity) => {
    expect(() => calculateSubtotal(99_900, quantity)).toThrow(RangeError);
  });

  it("rejects non-integer quantities", () => {
    expect(() => calculateSubtotal(99_900, 1.5)).toThrow(RangeError);
  });

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejects invalid paise %s", (amount) => {
    expect(() => assertPaise(amount)).toThrow(RangeError);
  });

  it("rejects negative total components", () => {
    expect(() => calculateTotal(99_900, -1, 0)).toThrow(RangeError);
    expect(() => calculateTotal(99_900, 0, -1)).toThrow(RangeError);
  });

  it("calculates total arithmetic", () => {
    expect(calculateTotal(99_900, 5_000, 1_800)).toBe(106_700);
  });
});
