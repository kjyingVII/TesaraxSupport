ALTER TABLE "Acknowledgement" ALTER COLUMN "ticketId" DROP NOT NULL;
ALTER TABLE "Acknowledgement" ADD COLUMN "machineLogId" TEXT;

CREATE UNIQUE INDEX "Acknowledgement_machineLogId_key" ON "Acknowledgement"("machineLogId");
CREATE INDEX "Acknowledgement_machineLogId_idx" ON "Acknowledgement"("machineLogId");

ALTER TABLE "Acknowledgement"
  ADD CONSTRAINT "Acknowledgement_machineLogId_fkey"
  FOREIGN KEY ("machineLogId") REFERENCES "MachineLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
