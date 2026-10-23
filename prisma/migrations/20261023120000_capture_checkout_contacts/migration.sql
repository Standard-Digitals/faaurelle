-- Checkout attempts are now saved as soon as a valid email or mobile number
-- is typed, before the delivery check runs.
ALTER TABLE "CheckoutAttempt" ALTER COLUMN "deliveryCheck" DROP NOT NULL;
