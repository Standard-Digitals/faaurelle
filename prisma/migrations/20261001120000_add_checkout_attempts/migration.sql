-- CreateEnum
CREATE TYPE "CheckoutDeliveryCheck" AS ENUM ('SERVICEABLE', 'NOT_SERVICEABLE', 'CHECK_FAILED');

-- CreateTable
CREATE TABLE "CheckoutAttempt" (
    "id" UUID NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'IN',
    "deliveryCheck" "CheckoutDeliveryCheck" NOT NULL,
    "detailsCheckCount" INTEGER NOT NULL DEFAULT 1,
    "orderId" UUID,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerAlertSentAt" TIMESTAMP(3),
    "digestSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutAttempt_dedupeKey_key" ON "CheckoutAttempt"("dedupeKey");

-- CreateIndex
CREATE INDEX "CheckoutAttempt_firstSeenAt_idx" ON "CheckoutAttempt"("firstSeenAt");

-- CreateIndex
CREATE INDEX "CheckoutAttempt_digestSentAt_idx" ON "CheckoutAttempt"("digestSentAt");

-- CreateIndex
CREATE INDEX "CheckoutAttempt_customerEmail_idx" ON "CheckoutAttempt"("customerEmail");

-- CreateIndex
CREATE INDEX "CheckoutAttempt_customerPhone_idx" ON "CheckoutAttempt"("customerPhone");

-- CreateIndex
CREATE INDEX "CheckoutAttempt_orderId_idx" ON "CheckoutAttempt"("orderId");

-- AddForeignKey
ALTER TABLE "CheckoutAttempt" ADD CONSTRAINT "CheckoutAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: every customer who already started a checkout (an Order exists),
-- one row per customer per IST day using their latest order that day. These
-- passed the delivery check, never get an instant alert, and unpaid ones are
-- left for the first daily summary.
INSERT INTO "CheckoutAttempt" (
    "id", "dedupeKey", "productCode", "customerName", "customerEmail", "customerPhone",
    "addressLine1", "addressLine2", "city", "state", "postalCode", "countryCode",
    "deliveryCheck", "orderId", "firstSeenAt", "lastSeenAt", "ownerAlertSentAt",
    "digestSentAt", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid(),
    to_char(o."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')
        || '|' || lower(o."customerEmail") || '|' || o."customerPhone",
    o."productCode", o."customerName", lower(o."customerEmail"), o."customerPhone",
    o."addressLine1", o."addressLine2", o."city", o."state", o."postalCode", o."countryCode",
    'SERVICEABLE', o."id", o."createdAt", o."updatedAt", CURRENT_TIMESTAMP,
    CASE WHEN o."paymentStatus" = 'CAPTURED' THEN CURRENT_TIMESTAMP ELSE NULL END,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT ON (
        lower("customerEmail"),
        "customerPhone",
        ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
    ) *
    FROM "Order"
    ORDER BY
        lower("customerEmail"),
        "customerPhone",
        ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date,
        "createdAt" DESC
) AS o;
