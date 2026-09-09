-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('INR');

-- CreateEnum
CREATE TYPE "OrderState" AS ENUM ('CHECKOUT_CREATED', 'AWAITING_PAYMENT', 'PAID', 'CONFIRMED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentState" AS ENUM ('NOT_STARTED', 'ORDER_CREATING', 'AWAITING_PAYMENT', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FulfillmentState" AS ENUM ('NOT_READY', 'PENDING', 'CREATING', 'CREATED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentAttemptState" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ShipmentState" AS ENUM ('PENDING', 'CREATING', 'CREATED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('PREPAID');

-- CreateEnum
CREATE TYPE "WebhookProcessingState" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "publicToken" TEXT NOT NULL,
    "checkoutKey" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unitAmountPaisa" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotalPaisa" INTEGER NOT NULL,
    "shippingPaisa" INTEGER NOT NULL,
    "taxPaisa" INTEGER NOT NULL,
    "totalPaisa" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'IN',
    "status" "OrderState" NOT NULL DEFAULT 'CHECKOUT_CREATED',
    "paymentStatus" "PaymentState" NOT NULL DEFAULT 'NOT_STARTED',
    "fulfillmentStatus" "FulfillmentState" NOT NULL DEFAULT 'NOT_READY',
    "razorpayOrderId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "razorpayPaymentId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "status" "PaymentAttemptState" NOT NULL,
    "amountPaisa" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'INR',
    "captured" BOOLEAN NOT NULL DEFAULT false,
    "signatureVerifiedAt" TIMESTAMP(3),
    "providerCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "ShipmentState" NOT NULL DEFAULT 'PENDING',
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'PREPAID',
    "delhiveryWaybill" TEXT,
    "delhiveryOrderReference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" UUID NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processingStatus" "WebhookProcessingState" NOT NULL DEFAULT 'RECEIVED',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_publicToken_key" ON "Order"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");

-- CreateIndex
CREATE UNIQUE INDEX "Order_razorpayOrderId_key" ON "Order"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "Order_customerEmail_idx" ON "Order"("customerEmail");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_razorpayOrderId_idx" ON "Payment"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_orderId_key" ON "Shipment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_delhiveryWaybill_key" ON "Shipment"("delhiveryWaybill");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_delhiveryOrderReference_key" ON "Shipment"("delhiveryOrderReference");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_providerEventId_key" ON "WebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "WebhookEvent_razorpayOrderId_idx" ON "WebhookEvent"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "WebhookEvent_razorpayPaymentId_idx" ON "WebhookEvent"("razorpayPaymentId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 1 commerce invariants that Prisma schema syntax cannot express.
ALTER TABLE "Order" ADD CONSTRAINT "Order_quantity_positive" CHECK ("quantity" >= 1);
ALTER TABLE "Order" ADD CONSTRAINT "Order_unit_amount_non_negative" CHECK ("unitAmountPaisa" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_subtotal_non_negative" CHECK ("subtotalPaisa" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_shipping_non_negative" CHECK ("shippingPaisa" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_tax_non_negative" CHECK ("taxPaisa" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_non_negative" CHECK ("totalPaisa" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_subtotal_arithmetic" CHECK ("subtotalPaisa" = "unitAmountPaisa" * "quantity");
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_arithmetic" CHECK ("totalPaisa" = "subtotalPaisa" + "shippingPaisa" + "taxPaisa");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_non_negative" CHECK ("amountPaisa" >= 0);

-- A Razorpay Order may have multiple attempts, but only one captured attempt
-- can be accepted as the paid result for an internal order.
CREATE UNIQUE INDEX "Payment_one_captured_per_order" ON "Payment"("orderId") WHERE "captured" = true;
