import { describe, expect, it } from "vitest";

describe("customer order reference generation", () => {
  it("creates a normalized reference from server-side random bytes", async () => {
    const { createCustomerOrderReference } = await import("./customer-order-reference");
    const reference = createCustomerOrderReference(() => Buffer.from("0123456789abcdef0123", "hex"));

    expect(reference).toBe("FA-0123456789ABCDEF0123");
    expect(reference).toMatch(/^FA-[A-F0-9]{20}$/);
  });

  it("does not derive the customer reference from a public-token prefix", async () => {
    const { createCustomerOrderReference } = await import("./customer-order-reference");
    const first = createCustomerOrderReference(() => Buffer.alloc(10, 1));
    const second = createCustomerOrderReference(() => Buffer.alloc(10, 2));

    expect(first).not.toBe(second);
    expect(first).toBe("FA-01010101010101010101");
    expect(second).toBe("FA-02020202020202020202");
  });
});
