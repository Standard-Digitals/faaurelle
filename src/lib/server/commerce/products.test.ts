import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("authoritative checkout product", () => {
  it("resolves the V1 product with its canonical price", async () => {
    const { getAuthoritativeProduct } = await import("./products");
    expect(getAuthoritativeProduct("hair-elixir")).toMatchObject({
      code: "hair-elixir",
      unitAmountPaisa: 99_900,
      currency: "INR",
      active: true,
    });
  });

  it("rejects unknown product codes", async () => {
    const { getAuthoritativeProduct } = await import("./products");
    expect(getAuthoritativeProduct("unknown-product")).toBeNull();
    expect(getAuthoritativeProduct("")).toBeNull();
  });
});
