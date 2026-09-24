-- The original coupon constraints hard-coded the three launch codes
-- (SIMRAN20, SAHIL20, NEW20), so every insert carrying an influencer code was
-- rejected by Postgres and free checkouts failed. Coupon validity is owned by
-- the application's coupon table; the database only enforces snapshot shape.

ALTER TABLE "Order" DROP CONSTRAINT "Order_coupon_snapshot_consistent";
ALTER TABLE "Order"
ADD CONSTRAINT "Order_coupon_snapshot_consistent" CHECK (
  ("couponCode" IS NULL AND "discountPaisa" = 0)
  OR
  ("couponCode" ~ '^[A-Z0-9]{1,32}$' AND "discountPaisa" > 0)
);

ALTER TABLE "CouponRedemption" DROP CONSTRAINT "CouponRedemption_couponCode_check";
ALTER TABLE "CouponRedemption"
ADD CONSTRAINT "CouponRedemption_couponCode_check" CHECK ("couponCode" ~ '^[A-Z0-9]{1,32}$');
