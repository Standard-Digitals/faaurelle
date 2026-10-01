// The coupon promoted across the site and pre-applied at checkout. The server
// coupon list (src/lib/server/commerce/coupons.ts) stays the authority on
// whether it is valid for a customer; keep the code and expiry in step.
export const featuredCoupon = Object.freeze({
  code: "NEW20",
  discountPercent: 20,
  // Exclusive end: valid through 30 Nov 2026 (IST).
  endsBefore: new Date("2026-11-30T18:30:00.000Z"),
});

export function isFeaturedCouponActive(now = new Date()) {
  return now.getTime() < featuredCoupon.endsBefore.getTime();
}

export function featuredCouponPricePaisa(unitAmountPaisa: number) {
  return Math.round((unitAmountPaisa * (100 - featuredCoupon.discountPercent)) / 100);
}
