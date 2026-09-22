import "server-only";

import { prisma } from "@/lib/server/db/prisma";

export const COUPON_EXPIRY_EXCLUSIVE = new Date("2026-11-30T18:30:00.000Z");
export const COUPON_DISCOUNT_PERCENT = 20 as const;
export const INFLUENCER_DISCOUNT_PERCENT = 100 as const;

// Sentinel redemption identity for singleUse coupons: recording every redemption
// under this fixed value (instead of the buyer's real email/phone) lets the
// existing @@unique([couponCode, normalizedEmail/Phone]) constraints enforce
// "this code redeems once, ever" atomically, with no schema migration.
export const SINGLE_USE_REDEMPTION_IDENTITY = "__single_use__";

function influencerCoupon(code: string) {
  return { code, discountPercent: INFLUENCER_DISCOUNT_PERCENT, singleUse: true as const };
}

const coupons = Object.freeze({
  SIMRAN20: { code: "SIMRAN20", discountPercent: COUPON_DISCOUNT_PERCENT, singleUse: false as const },
  SAHIL20: { code: "SAHIL20", discountPercent: COUPON_DISCOUNT_PERCENT, singleUse: false as const },
  NEW20: { code: "NEW20", discountPercent: COUPON_DISCOUNT_PERCENT, singleUse: false as const },
  INFLUENCER01: influencerCoupon("INFLUENCER01"),
  INFLUENCER02: influencerCoupon("INFLUENCER02"),
  INFLUENCER03: influencerCoupon("INFLUENCER03"),
  INFLUENCER04: influencerCoupon("INFLUENCER04"),
  INFLUENCER05: influencerCoupon("INFLUENCER05"),
  INFLUENCER06: influencerCoupon("INFLUENCER06"),
  INFLUENCER07: influencerCoupon("INFLUENCER07"),
  INFLUENCER08: influencerCoupon("INFLUENCER08"),
  INFLUENCER09: influencerCoupon("INFLUENCER09"),
  INFLUENCER10: influencerCoupon("INFLUENCER10"),
  INFLUENCER11: influencerCoupon("INFLUENCER11"),
  INFLUENCER12: influencerCoupon("INFLUENCER12"),
  INFLUENCER13: influencerCoupon("INFLUENCER13"),
  INFLUENCER14: influencerCoupon("INFLUENCER14"),
  INFLUENCER15: influencerCoupon("INFLUENCER15"),
  INFLUENCER16: influencerCoupon("INFLUENCER16"),
  INFLUENCER17: influencerCoupon("INFLUENCER17"),
  INFLUENCER18: influencerCoupon("INFLUENCER18"),
  INFLUENCER19: influencerCoupon("INFLUENCER19"),
  INFLUENCER20: influencerCoupon("INFLUENCER20"),
  INFLUENCER21: influencerCoupon("INFLUENCER21"),
  INFLUENCER22: influencerCoupon("INFLUENCER22"),
  INFLUENCER23: influencerCoupon("INFLUENCER23"),
  INFLUENCER24: influencerCoupon("INFLUENCER24"),
  INFLUENCER25: influencerCoupon("INFLUENCER25"),
} as const);

export type CouponCode = keyof typeof coupons;

export function normalizeCouponCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function getCoupon(value: unknown, now = new Date()) {
  const code = normalizeCouponCode(value);
  const coupon = coupons[code as CouponCode];
  return coupon && now.getTime() < COUPON_EXPIRY_EXCLUSIVE.getTime() ? coupon : null;
}

/** Looks up a coupon's static definition (e.g. its singleUse flag) without the expiry gate. */
export function getCouponDefinition(value: unknown) {
  const code = normalizeCouponCode(value);
  return coupons[code as CouponCode] ?? null;
}

type RedemptionStore = {
  findFirst(args: { where: Record<string, unknown>; select: { id: true } }): Promise<{ id: string } | null>;
};

export async function validateCouponEligibility(
  value: unknown,
  identity: { email: string; phone: string },
  options: { now?: Date; redemptions?: RedemptionStore } = {},
) {
  const normalized = normalizeCouponCode(value);
  const coupon = getCoupon(normalized, options.now);
  if (!coupon) {
    const known = Boolean(coupons[normalized as CouponCode]);
    return { success: false as const, reason: known ? "expired" as const : "invalid" as const };
  }
  const where = coupon.singleUse
    ? { couponCode: coupon.code }
    : { couponCode: coupon.code, OR: [{ normalizedEmail: identity.email }, { normalizedPhone: identity.phone }] };
  const redemption = await (options.redemptions ?? (prisma.couponRedemption as unknown as RedemptionStore)).findFirst({
    where,
    select: { id: true },
  });
  if (redemption) return { success: false as const, reason: "used" as const };
  return { success: true as const, coupon };
}
