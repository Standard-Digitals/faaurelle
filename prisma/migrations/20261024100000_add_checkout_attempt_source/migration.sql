-- Leads from the product page offer popup are saved alongside checkout
-- attempts; existing rows all came from checkout.
CREATE TYPE "CheckoutAttemptSource" AS ENUM ('CHECKOUT', 'PRODUCT_POPUP');

ALTER TABLE "CheckoutAttempt" ADD COLUMN "source" "CheckoutAttemptSource" NOT NULL DEFAULT 'CHECKOUT';
