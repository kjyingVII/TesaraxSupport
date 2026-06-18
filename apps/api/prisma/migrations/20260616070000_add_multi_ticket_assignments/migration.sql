ALTER TABLE "TicketAssignment" ADD COLUMN "unassignedByUserId" TEXT;
ALTER TABLE "TicketAssignment" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TicketAssignment" ADD COLUMN "isLead" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TicketAssignment" ADD COLUMN "unassignedAt" TIMESTAMP(3);

UPDATE "TicketAssignment" ta
SET "isLead" = true
FROM "Ticket" t
WHERE ta."ticketId" = t."id"
  AND ta."assignedToUserId" = t."assignedTechnicianId";

CREATE INDEX "TicketAssignment_unassignedByUserId_idx" ON "TicketAssignment"("unassignedByUserId");
CREATE INDEX "TicketAssignment_isActive_idx" ON "TicketAssignment"("isActive");
CREATE INDEX "TicketAssignment_isLead_idx" ON "TicketAssignment"("isLead");

ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_unassignedByUserId_fkey" FOREIGN KEY ("unassignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
