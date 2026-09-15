import "server-only";

import { prisma } from "@/lib/server/db/prisma";

export const COUPON_EXPIRY_EXCLUSIVE = new Date("2026-11-30T18:30:00.000Z");
export const COUPON_DISCOUNT_PERCENT = 20 as const;

const coupons = Object.freeze({
  SIMRAN20: { code: "SIMRAN20", discountPercent: COUPON_DISCOUNT_PERCENT },
  SAHIL20: { code: "SAHIL20", discountPercent: COUPON_DISCOUNT_PERCENT },
  NEW20: { code: "NEW20", discountPercent: COUPON_DISCOUNT_PERCENT },
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
  const redemption = await (options.redemptions ?? (prisma.couponRedemption as unknown as RedemptionStore)).findFirst({
    where: {
      couponCode: coupon.code,
      OR: [{ normalizedEmail: identity.email }, { normalizedPhone: identity.phone }],
    },
    select: { id: true },
  });
  if (redemption) return { success: false as const, reason: "used" as const };
  return { success: true as const, coupon };
}
