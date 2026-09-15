import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

describe("authoritative coupons", () => {
  it.each(["SIMRAN20", "SAHIL20", "NEW20"])("accepts %s before expiry", async (code) => {
    const { getCoupon } = await import("./coupons");
    expect(getCoupon(` ${code.toLowerCase()} `, new Date("2026-11-30T18:29:59.999Z")))
      .toMatchObject({ code, discountPercent: 20 });
  });

  it("rejects unknown codes and the exact India expiry boundary", async () => {
    const { getCoupon } = await import("./coupons");
    expect(getCoupon("SIMRAN", new Date("2026-01-01T00:00:00Z"))).toBeNull();
    expect(getCoupon("SIMRAN20", new Date("2026-11-30T18:30:00.000Z"))).toBeNull();
  });

  it("checks successful use by normalized email or phone without revealing which", async () => {
    const { validateCouponEligibility } = await import("./coupons");
    const redemptions = { findFirst: vi.fn().mockResolvedValue({ id: "used" }) };
    await expect(validateCouponEligibility("simran20", { email: "a@example.com", phone: "+919876543210" }, { redemptions }))
      .resolves.toEqual({ success: false, reason: "used" });
    expect(redemptions.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ couponCode: "SIMRAN20", OR: expect.any(Array) }),
    }));
  });

  it("allows another coupon for the same user and the same coupon for another user", async () => {
    const rows = [{ couponCode: "SIMRAN20", normalizedEmail: "used@example.com", normalizedPhone: "+919876543210" }];
    const redemptions = {
      findFirst: vi.fn(async ({ where }: { where: { couponCode: string; OR: Array<Record<string, string>> } }) =>
        rows.find((row) => row.couponCode === where.couponCode && where.OR.some((identity) =>
          identity.normalizedEmail === row.normalizedEmail || identity.normalizedPhone === row.normalizedPhone))
          ? { id: "used" }
          : null),
    };
    const { validateCouponEligibility } = await import("./coupons");
    await expect(validateCouponEligibility("SAHIL20", { email: "used@example.com", phone: "+919876543210" }, { redemptions: redemptions as never }))
      .resolves.toMatchObject({ success: true });
    await expect(validateCouponEligibility("SIMRAN20", { email: "other@example.com", phone: "+919999999999" }, { redemptions: redemptions as never }))
      .resolves.toMatchObject({ success: true });
  });
});
