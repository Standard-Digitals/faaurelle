ALTER TABLE "Order" ADD COLUMN "customerReference" TEXT;

-- Existing public tokens are already random and unique. Hashing them creates a
-- separate non-reversible, human-readable reference without exposing a token
-- prefix or changing any historical order/payment/shipment state.
UPDATE "Order"
SET "customerReference" = 'FA-' || UPPER(SUBSTRING(MD5("publicToken") FROM 1 FOR 20));

ALTER TABLE "Order" ALTER COLUMN "customerReference" SET NOT NULL;

ALTER TABLE "Order"
ADD CONSTRAINT "Order_customerReference_format_check"
CHECK ("customerReference" ~ '^FA-[A-F0-9]{20}$');

CREATE UNIQUE INDEX "Order_customerReference_key" ON "Order"("customerReference");
