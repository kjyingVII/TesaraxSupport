ALTER TABLE "Acknowledgement" ADD COLUMN "serviceReportId" TEXT;

DROP INDEX IF EXISTS "Acknowledgement_ticketId_key";

CREATE UNIQUE INDEX "Acknowledgement_serviceReportId_key" ON "Acknowledgement"("serviceReportId");
CREATE INDEX "Acknowledgement_serviceReportId_idx" ON "Acknowledgement"("serviceReportId");

ALTER TABLE "Acknowledgement"
  ADD CONSTRAINT "Acknowledgement_serviceReportId_fkey"
  FOREIGN KEY ("serviceReportId") REFERENCES "ServiceReport"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
