ALTER TABLE "Order"
ADD COLUMN "confirmationEmailClaimedAt" TIMESTAMP(3),
ADD COLUMN "confirmationEmailSentAt" TIMESTAMP(3),
ADD COLUMN "confirmationEmailLastError" TEXT;
