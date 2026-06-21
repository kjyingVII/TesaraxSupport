CREATE TABLE "WhatsAppWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'meta',
    "eventType" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "senderPhone" TEXT,
    "status" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsAppWebhookEvent_provider_receivedAt_idx" ON "WhatsAppWebhookEvent"("provider", "receivedAt");
CREATE INDEX "WhatsAppWebhookEvent_eventType_receivedAt_idx" ON "WhatsAppWebhookEvent"("eventType", "receivedAt");
CREATE INDEX "WhatsAppWebhookEvent_providerMessageId_idx" ON "WhatsAppWebhookEvent"("providerMessageId");
