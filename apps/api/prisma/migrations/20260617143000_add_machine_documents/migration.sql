ALTER TYPE "AttachmentRelatedType" ADD VALUE IF NOT EXISTS 'MACHINE_DOCUMENT';

ALTER TABLE "Attachment" ADD COLUMN "machineId" TEXT;

CREATE INDEX "Attachment_machineId_idx" ON "Attachment"("machineId");

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_machineId_fkey"
  FOREIGN KEY ("machineId") REFERENCES "Machine"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
