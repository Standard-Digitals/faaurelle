ALTER TABLE "Order"
ADD COLUMN "couponCode" TEXT,
ADD COLUMN "discountPaisa" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_discountPaisa_valid" CHECK ("discountPaisa" >= 0 AND "discountPaisa" <= "subtotalPaisa"),
ADD CONSTRAINT "Order_coupon_snapshot_consistent" CHECK (
  ("couponCode" IS NULL AND "discountPaisa" = 0)
  OR
  ("couponCode" IN ('SIMRAN20', 'SAHIL20', 'NEW20') AND "discountPaisa" > 0)
),
ADD CONSTRAINT "Order_discount_total_consistent" CHECK (
  "totalPaisa" = "subtotalPaisa" - "discountPaisa" + "shippingPaisa" + "taxPaisa"
);

CREATE TABLE "CouponRedemption" (
  "id" UUID NOT NULL,
  "couponCode" TEXT NOT NULL,
  "normalizedEmail" TEXT NOT NULL,
  "normalizedPhone" TEXT NOT NULL,
  "orderId" UUID NOT NULL,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CouponRedemption_couponCode_check" CHECK ("couponCode" IN ('SIMRAN20', 'SAHIL20', 'NEW20')),
  CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");
CREATE UNIQUE INDEX "CouponRedemption_couponCode_normalizedEmail_key" ON "CouponRedemption"("couponCode", "normalizedEmail");
CREATE UNIQUE INDEX "CouponRedemption_couponCode_normalizedPhone_key" ON "CouponRedemption"("couponCode", "normalizedPhone");
CREATE INDEX "CouponRedemption_redeemedAt_idx" ON "CouponRedemption"("redeemedAt");
