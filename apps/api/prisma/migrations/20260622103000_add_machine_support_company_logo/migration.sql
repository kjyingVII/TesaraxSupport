ALTER TYPE "AttachmentRelatedType" ADD VALUE 'MACHINE_SUPPORT_LOGO';

ALTER TABLE "Machine" ADD COLUMN "supportCompanyLogoAttachmentId" TEXT;

CREATE UNIQUE INDEX "Machine_supportCompanyLogoAttachmentId_key" ON "Machine"("supportCompanyLogoAttachmentId");

ALTER TABLE "Machine"
  ADD CONSTRAINT "Machine_supportCompanyLogoAttachmentId_fkey"
  FOREIGN KEY ("supportCompanyLogoAttachmentId") REFERENCES "Attachment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
