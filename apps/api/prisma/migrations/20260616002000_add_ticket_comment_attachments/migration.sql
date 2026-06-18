ALTER TYPE "AttachmentRelatedType" ADD VALUE IF NOT EXISTS 'TICKET_COMMENT';

ALTER TABLE "Attachment"
ADD COLUMN "ticketCommentId" TEXT;

ALTER TABLE "Attachment"
ADD CONSTRAINT "Attachment_ticketCommentId_fkey"
FOREIGN KEY ("ticketCommentId") REFERENCES "TicketComment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Attachment_ticketCommentId_idx" ON "Attachment"("ticketCommentId");
