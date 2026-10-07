import "server-only";

import { prisma } from "@/lib/server/db/prisma";

export const COUPON_EXPIRY_EXCLUSIVE = new Date("2026-11-30T18:30:00.000Z");
export const COUPON_DISCOUNT_PERCENT = 20 as const;
export const INFLUENCER_DISCOUNT_PERCENT = 100 as const;
// SAHIL20 ends earlier than the rest: valid through 30 Sep 2026 (IST).
const SAHIL20_EXPIRY_EXCLUSIVE = new Date("2026-09-30T18:30:00.000Z");

type CouponDefinition = Readonly<{
  code: string;
  discountPercent: number;
  singleUse: boolean;
  // Overrides COUPON_EXPIRY_EXCLUSIVE for this coupon only.
  expiresBefore?: Date;
}>;

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
  SAHIL20: { code: "SAHIL20", discountPercent: COUPON_DISCOUNT_PERCENT, singleUse: false as const, expiresBefore: SAHIL20_EXPIRY_EXCLUSIVE },
  NEW20: { code: "NEW20", discountPercent: COUPON_DISCOUNT_PERCENT, singleUse: false as const },
  SOUMYA20: { code: "SOUMYA20", discountPercent: COUPON_DISCOUNT_PERCENT, singleUse: false as const },
  PRIYANKA20: { code: "PRIYANKA20", discountPercent: COUPON_DISCOUNT_PERCENT, singleUse: false as const },
  MALIKA20: { code: "MALIKA20", discountPercent: COUPON_DISCOUNT_PERCENT, singleUse: false as const },
  SAHILALI10: { code: "SAHILALI10", discountPercent: 10, singleUse: true as const },
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
  FAQBQNAVV5: influencerCoupon("FAQBQNAVV5"),
  FA3NKYEQGL: influencerCoupon("FA3NKYEQGL"),
  FA37UACVGP: influencerCoupon("FA37UACVGP"),
  FA5RG55PKP: influencerCoupon("FA5RG55PKP"),
  FAW77ML6SR: influencerCoupon("FAW77ML6SR"),
  FABLV58WBK: influencerCoupon("FABLV58WBK"),
  FAC4ZWS5XD: influencerCoupon("FAC4ZWS5XD"),
  FALPQCJF6J: influencerCoupon("FALPQCJF6J"),
  FAS73QCDFL: influencerCoupon("FAS73QCDFL"),
  FA24Q9C89K: influencerCoupon("FA24Q9C89K"),
  FAXY596QWK: influencerCoupon("FAXY596QWK"),
  FAZPHCPQGS: influencerCoupon("FAZPHCPQGS"),
  FACQRQ3ESY: influencerCoupon("FACQRQ3ESY"),
  FAQ3LMFKJR: influencerCoupon("FAQ3LMFKJR"),
  FA5MYRAM5H: influencerCoupon("FA5MYRAM5H"),
  FAJECPVAYL: influencerCoupon("FAJECPVAYL"),
  FAFCZUB5DJ: influencerCoupon("FAFCZUB5DJ"),
  FA32ZZA2BS: influencerCoupon("FA32ZZA2BS"),
  FA82TQ7E9B: influencerCoupon("FA82TQ7E9B"),
  FAM3AAW7FP: influencerCoupon("FAM3AAW7FP"),
  FAA2DXMHAS: influencerCoupon("FAA2DXMHAS"),
  FA7QXMSS44: influencerCoupon("FA7QXMSS44"),
  FAEU73ASRT: influencerCoupon("FAEU73ASRT"),
  FASDN6LQ6T: influencerCoupon("FASDN6LQ6T"),
  FAW49SB53Z: influencerCoupon("FAW49SB53Z"),
  FAWNMT4RKG: influencerCoupon("FAWNMT4RKG"),
  FAPSYEL5H7: influencerCoupon("FAPSYEL5H7"),
  FAMBAFNTTK: influencerCoupon("FAMBAFNTTK"),
  FASDTQYSG6: influencerCoupon("FASDTQYSG6"),
  FANM4RL2KE: influencerCoupon("FANM4RL2KE"),
} as const satisfies Record<string, CouponDefinition>);

export type CouponCode = keyof typeof coupons;

export function normalizeCouponCode(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function getCoupon(value: unknown, now = new Date()) {
  const code = normalizeCouponCode(value);
  const coupon: CouponDefinition | undefined = coupons[code as CouponCode];
  const expiresBefore = coupon?.expiresBefore ?? COUPON_EXPIRY_EXCLUSIVE;
  return coupon && now.getTime() < expiresBefore.getTime() ? coupon : null;
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
