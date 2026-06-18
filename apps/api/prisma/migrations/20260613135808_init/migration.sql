-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPERVISOR', 'TECHNICIAN');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'PENDING_ACKNOWLEDGEMENT', 'CLOSED', 'FOLLOW_UP_REQUIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'URGENT', 'MACHINE_DOWN');

-- CreateEnum
CREATE TYPE "MachineLogType" AS ENUM ('SERVICE', 'UPGRADE');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('UPCOMING', 'DUE', 'OVERDUE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AcknowledgementResponse" AS ENUM ('ACCEPTED', 'FOLLOW_UP_REQUESTED');

-- CreateEnum
CREATE TYPE "TicketCommentVisibility" AS ENUM ('INTERNAL', 'REQUESTER_VISIBLE');

-- CreateEnum
CREATE TYPE "ServiceResolutionStatus" AS ENUM ('RESOLVED', 'PARTIALLY_RESOLVED', 'NOT_RESOLVED');

-- CreateEnum
CREATE TYPE "AttachmentRelatedType" AS ENUM ('TICKET', 'SERVICE_REPORT', 'MACHINE_LOG', 'ACKNOWLEDGEMENT_SIGNATURE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "remarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Machine" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "qrCodeUrl" TEXT,
    "serviceReminderIntervalDays" INTEGER NOT NULL,
    "lastServiceAt" TIMESTAMP(3),
    "nextServiceDueAt" TIMESTAMP(3),
    "lastUpgradeAt" TIMESTAMP(3),
    "installationDate" TIMESTAMP(3),
    "warrantyExpiryDate" TIMESTAMP(3),
    "internalRemarks" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Machine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "requesterName" TEXT NOT NULL,
    "requesterCompany" TEXT,
    "requesterDepartment" TEXT,
    "requesterPhone" TEXT,
    "requesterEmail" TEXT,
    "issueTitle" TEXT NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "issueCategory" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'NEW',
    "assignedTechnicianId" TEXT,
    "createdFromPublicQr" BOOLEAN NOT NULL DEFAULT false,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketStatusHistory" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromStatus" "TicketStatus",
    "toStatus" "TicketStatus" NOT NULL,
    "changedByUserId" TEXT,
    "changedByRequesterName" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "visibility" "TicketCommentVisibility" NOT NULL DEFAULT 'INTERNAL',
    "createdByUserId" TEXT,
    "createdByRequesterName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketAssignment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "assignedToUserId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReport" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "actionTaken" TEXT NOT NULL,
    "partsUsed" TEXT,
    "recommendations" TEXT,
    "technicianRemarks" TEXT,
    "serviceStartAt" TIMESTAMP(3) NOT NULL,
    "serviceEndAt" TIMESTAMP(3) NOT NULL,
    "resolutionStatus" "ServiceResolutionStatus" NOT NULL,
    "submittedForAcknowledgementAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineLog" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "ticketId" TEXT,
    "serviceReportId" TEXT,
    "logType" "MachineLogType" NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "workSummary" TEXT NOT NULL,
    "partsUsed" TEXT,
    "upgradeVersion" TEXT,
    "upgradeDescription" TEXT,
    "nextServiceDueOverrideAt" TIMESTAMP(3),
    "requesterConfirmedName" TEXT,
    "requesterConfirmedAt" TIMESTAMP(3),
    "loggedByUserId" TEXT,
    "loggedByRequesterName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Acknowledgement" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "acknowledgementTokenHash" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "response" "AcknowledgementResponse",
    "requesterName" TEXT,
    "requesterComment" TEXT,
    "signatureAttachmentId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Acknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "relatedType" "AttachmentRelatedType" NOT NULL,
    "ticketId" TEXT,
    "serviceReportId" TEXT,
    "machineLogId" TEXT,
    "acknowledgementId" TEXT,
    "uploadedByUserId" TEXT,
    "uploadedByRequesterName" TEXT,
    "originalFileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "storageBucket" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceReminderLog" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "reminderType" "ReminderType" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "sentToName" TEXT,
    "sentToEmail" TEXT,
    "sentToPhone" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRequesterName" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "subject" TEXT,
    "messageSummary" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE INDEX "Customer_isActive_idx" ON "Customer"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Machine_publicId_key" ON "Machine"("publicId");

-- CreateIndex
CREATE INDEX "Machine_customerId_idx" ON "Machine"("customerId");

-- CreateIndex
CREATE INDEX "Machine_serialNumber_idx" ON "Machine"("serialNumber");

-- CreateIndex
CREATE INDEX "Machine_nextServiceDueAt_idx" ON "Machine"("nextServiceDueAt");

-- CreateIndex
CREATE INDEX "Machine_isActive_idx" ON "Machine"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_machineId_idx" ON "Ticket"("machineId");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_priority_idx" ON "Ticket"("priority");

-- CreateIndex
CREATE INDEX "Ticket_assignedTechnicianId_idx" ON "Ticket"("assignedTechnicianId");

-- CreateIndex
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");

-- CreateIndex
CREATE INDEX "TicketStatusHistory_ticketId_idx" ON "TicketStatusHistory"("ticketId");

-- CreateIndex
CREATE INDEX "TicketStatusHistory_changedByUserId_idx" ON "TicketStatusHistory"("changedByUserId");

-- CreateIndex
CREATE INDEX "TicketStatusHistory_createdAt_idx" ON "TicketStatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX "TicketComment_ticketId_idx" ON "TicketComment"("ticketId");

-- CreateIndex
CREATE INDEX "TicketComment_createdByUserId_idx" ON "TicketComment"("createdByUserId");

-- CreateIndex
CREATE INDEX "TicketAssignment_ticketId_idx" ON "TicketAssignment"("ticketId");

-- CreateIndex
CREATE INDEX "TicketAssignment_assignedToUserId_idx" ON "TicketAssignment"("assignedToUserId");

-- CreateIndex
CREATE INDEX "TicketAssignment_assignedByUserId_idx" ON "TicketAssignment"("assignedByUserId");

-- CreateIndex
CREATE INDEX "ServiceReport_ticketId_idx" ON "ServiceReport"("ticketId");

-- CreateIndex
CREATE INDEX "ServiceReport_technicianId_idx" ON "ServiceReport"("technicianId");

-- CreateIndex
CREATE INDEX "MachineLog_machineId_idx" ON "MachineLog"("machineId");

-- CreateIndex
CREATE INDEX "MachineLog_ticketId_idx" ON "MachineLog"("ticketId");

-- CreateIndex
CREATE INDEX "MachineLog_serviceReportId_idx" ON "MachineLog"("serviceReportId");

-- CreateIndex
CREATE INDEX "MachineLog_logType_idx" ON "MachineLog"("logType");

-- CreateIndex
CREATE INDEX "MachineLog_workDate_idx" ON "MachineLog"("workDate");

-- CreateIndex
CREATE UNIQUE INDEX "Acknowledgement_ticketId_key" ON "Acknowledgement"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "Acknowledgement_signatureAttachmentId_key" ON "Acknowledgement"("signatureAttachmentId");

-- CreateIndex
CREATE INDEX "Acknowledgement_ticketId_idx" ON "Acknowledgement"("ticketId");

-- CreateIndex
CREATE INDEX "Acknowledgement_acknowledgementTokenHash_idx" ON "Acknowledgement"("acknowledgementTokenHash");

-- CreateIndex
CREATE INDEX "Acknowledgement_tokenExpiresAt_idx" ON "Acknowledgement"("tokenExpiresAt");

-- CreateIndex
CREATE INDEX "Attachment_ticketId_idx" ON "Attachment"("ticketId");

-- CreateIndex
CREATE INDEX "Attachment_serviceReportId_idx" ON "Attachment"("serviceReportId");

-- CreateIndex
CREATE INDEX "Attachment_machineLogId_idx" ON "Attachment"("machineLogId");

-- CreateIndex
CREATE INDEX "Attachment_acknowledgementId_idx" ON "Attachment"("acknowledgementId");

-- CreateIndex
CREATE INDEX "Attachment_uploadedByUserId_idx" ON "Attachment"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "ServiceReminderLog_machineId_idx" ON "ServiceReminderLog"("machineId");

-- CreateIndex
CREATE INDEX "ServiceReminderLog_dueDate_idx" ON "ServiceReminderLog"("dueDate");

-- CreateIndex
CREATE INDEX "ServiceReminderLog_status_idx" ON "ServiceReminderLog"("status");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_relatedType_relatedId_idx" ON "NotificationLog"("relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "NotificationLog_channel_idx" ON "NotificationLog"("channel");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Machine" ADD CONSTRAINT "Machine_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketStatusHistory" ADD CONSTRAINT "TicketStatusHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketStatusHistory" ADD CONSTRAINT "TicketStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketAssignment" ADD CONSTRAINT "TicketAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReport" ADD CONSTRAINT "ServiceReport_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineLog" ADD CONSTRAINT "MachineLog_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineLog" ADD CONSTRAINT "MachineLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineLog" ADD CONSTRAINT "MachineLog_serviceReportId_fkey" FOREIGN KEY ("serviceReportId") REFERENCES "ServiceReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineLog" ADD CONSTRAINT "MachineLog_loggedByUserId_fkey" FOREIGN KEY ("loggedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acknowledgement" ADD CONSTRAINT "Acknowledgement_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acknowledgement" ADD CONSTRAINT "Acknowledgement_signatureAttachmentId_fkey" FOREIGN KEY ("signatureAttachmentId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_serviceReportId_fkey" FOREIGN KEY ("serviceReportId") REFERENCES "ServiceReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_machineLogId_fkey" FOREIGN KEY ("machineLogId") REFERENCES "MachineLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_acknowledgementId_fkey" FOREIGN KEY ("acknowledgementId") REFERENCES "Acknowledgement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceReminderLog" ADD CONSTRAINT "ServiceReminderLog_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
