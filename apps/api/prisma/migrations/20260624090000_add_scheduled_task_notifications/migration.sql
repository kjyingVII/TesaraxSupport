ALTER TABLE "ScheduledTask"
  ADD COLUMN "notifyRecipientName" TEXT,
  ADD COLUMN "notifyRecipientPhone" TEXT,
  ADD COLUMN "notifyRecipientEmail" TEXT,
  ADD COLUMN "notifiedAt" TIMESTAMP(3);

CREATE INDEX "ScheduledTask_notifyRecipientPhone_idx" ON "ScheduledTask"("notifyRecipientPhone");
