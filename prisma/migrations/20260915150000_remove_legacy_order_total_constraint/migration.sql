-- Phase 10 replaces the original no-discount arithmetic constraint with
-- Order_discount_total_consistent, which includes discountPaisa.
ALTER TABLE "Order"
DROP CONSTRAINT IF EXISTS "Order_total_arithmetic";
