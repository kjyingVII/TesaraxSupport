ALTER TABLE "MachineLog"
  ADD COLUMN "notifyCustomer" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "notifyRecipientName" TEXT,
  ADD COLUMN "notifyRecipientPhone" TEXT,
  ADD COLUMN "notifyRecipientEmail" TEXT,
  ADD COLUMN "notifyMessage" TEXT,
  ADD COLUMN "notifiedAt" TIMESTAMP(3);

CREATE INDEX "MachineLog_notifyCustomer_idx" ON "MachineLog"("notifyCustomer");
