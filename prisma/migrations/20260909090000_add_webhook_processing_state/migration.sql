ALTER TYPE "WebhookProcessingState" ADD VALUE 'PROCESSING';
ALTER TABLE "WebhookEvent" ADD COLUMN "processingStartedAt" TIMESTAMP(3);
