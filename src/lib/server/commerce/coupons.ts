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
  // Random 10-char codes (not sequential) so one leaked/guessed code can't be
  // used to enumerate the rest — each is only ever handed to one influencer.
  FABZJSU4QK: influencerCoupon("FABZJSU4QK"),
  FAFTXBUPCC: influencerCoupon("FAFTXBUPCC"),
  FA77YQYJH7: influencerCoupon("FA77YQYJH7"),
  FARV3S7FYS: influencerCoupon("FARV3S7FYS"),
  FAVQ4VYMXJ: influencerCoupon("FAVQ4VYMXJ"),
  FAVYDW4MAV: influencerCoupon("FAVYDW4MAV"),
  FAQGEBT6Z2: influencerCoupon("FAQGEBT6Z2"),
  FAVMJT8C34: influencerCoupon("FAVMJT8C34"),
  FAS6NEBFKF: influencerCoupon("FAS6NEBFKF"),
  FAEWJ6MS2R: influencerCoupon("FAEWJ6MS2R"),
  FA3TF8S7TD: influencerCoupon("FA3TF8S7TD"),
  FAA4GN4529: influencerCoupon("FAA4GN4529"),
  FA8KHQ6925: influencerCoupon("FA8KHQ6925"),
  FABRX2GGYH: influencerCoupon("FABRX2GGYH"),
  FAQF8FSBYX: influencerCoupon("FAQF8FSBYX"),
  FAN3QEVHD8: influencerCoupon("FAN3QEVHD8"),
  FA25RQBEB5: influencerCoupon("FA25RQBEB5"),
  FAAEZHMJ49: influencerCoupon("FAAEZHMJ49"),
  FA3RRPASFM: influencerCoupon("FA3RRPASFM"),
  FAZ8DJRWDM: influencerCoupon("FAZ8DJRWDM"),
  FAQR3MD4Q4: influencerCoupon("FAQR3MD4Q4"),
  FABXNPMUA2: influencerCoupon("FABXNPMUA2"),
  FAAMD7GRBA: influencerCoupon("FAAMD7GRBA"),
  FAHM9Y9CSR: influencerCoupon("FAHM9Y9CSR"),
  FA4YZCGY2X: influencerCoupon("FA4YZCGY2X"),
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
