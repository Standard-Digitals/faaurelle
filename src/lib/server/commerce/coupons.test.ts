import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

describe("authoritative coupons", () => {
  it.each(["SIMRAN20", "NEW20", "SOUMYA20", "PRIYANKA20", "MALIKA20", "SAMRIDHI20", "SAHIL20"])(
    "gives 35%% off with %s through 8 Nov 2026 in India",
    async (code) => {
      const { getCoupon } = await import("./coupons");
      expect(getCoupon(` ${code.toLowerCase()} `, new Date("2026-11-08T18:29:59.999Z")))
        .toMatchObject({ code, discountPercent: 35 });
      expect(getCoupon(code, new Date("2026-11-08T18:30:00.000Z"))).toBeNull();
    },
  );

  it("rejects unknown codes and the exact India expiry boundary", async () => {
    const { getCoupon } = await import("./coupons");
    expect(getCoupon("SIMRAN", new Date("2026-01-01T00:00:00Z"))).toBeNull();
    expect(getCoupon("DIVA35", new Date("2026-11-30T18:30:00.000Z"))).toBeNull();
  });

  it("keeps DIVA35 running after the 8 Nov codes end", async () => {
    const { getCoupon } = await import("./coupons");
    expect(getCoupon("DIVA35", new Date("2026-11-08T18:30:00.000Z"))).toMatchObject({ code: "DIVA35", discountPercent: 35 });
  });

  it("reports an expired 8 Nov code as expired, not invalid", async () => {
    const { validateCouponEligibility } = await import("./coupons");
    const redemptions = { findFirst: vi.fn() };
    await expect(validateCouponEligibility("SAHIL20", { email: "a@example.com", phone: "+919876543210" }, { redemptions, now: new Date("2026-11-09T00:00:00Z") }))
      .resolves.toEqual({ success: false, reason: "expired" });
    expect(redemptions.findFirst).not.toHaveBeenCalled();
  });

  it("resolves SAHILALI10 to a one-time 10% discount", async () => {
    const { validateCouponEligibility } = await import("./coupons");
    const unused = { findFirst: vi.fn().mockResolvedValue(null) };
    await expect(validateCouponEligibility("sahilali10", { email: "a@example.com", phone: "+919876543210" }, { redemptions: unused, now: new Date("2026-10-15T00:00:00Z") }))
      .resolves.toMatchObject({ success: true, coupon: { code: "SAHILALI10", discountPercent: 10, singleUse: true } });
    const used = { findFirst: vi.fn().mockResolvedValue({ id: "used" }) };
    await expect(validateCouponEligibility("SAHILALI10", { email: "other@example.com", phone: "+919000000000" }, { redemptions: used }))
      .resolves.toEqual({ success: false, reason: "used" });
    expect(used.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { couponCode: "SAHILALI10" } }));
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

  it("treats a singleUse coupon as globally exhausted regardless of identity", async () => {
    const { validateCouponEligibility } = await import("./coupons");
    const redemptions = { findFirst: vi.fn().mockResolvedValue({ id: "used" }) };
    await expect(validateCouponEligibility("FABZJSU4QK", { email: "anyone@example.com", phone: "+919000000000" }, { redemptions }))
      .resolves.toEqual({ success: false, reason: "used" });
    expect(redemptions.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { couponCode: "FABZJSU4QK" },
    }));
  });

  it("resolves an unredeemed singleUse coupon to a 100% discount", async () => {
    const { validateCouponEligibility } = await import("./coupons");
    const redemptions = { findFirst: vi.fn().mockResolvedValue(null) };
    await expect(validateCouponEligibility("faftxbupcc", { email: "a@example.com", phone: "+919876543210" }, { redemptions }))
      .resolves.toMatchObject({ success: true, coupon: { code: "FAFTXBUPCC", discountPercent: 100, singleUse: true } });
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
    await expect(validateCouponEligibility("NEW20", { email: "used@example.com", phone: "+919876543210" }, { redemptions: redemptions as never }))
      .resolves.toMatchObject({ success: true });
    await expect(validateCouponEligibility("SIMRAN20", { email: "other@example.com", phone: "+919999999999" }, { redemptions: redemptions as never }))
      .resolves.toMatchObject({ success: true });
  });
});
