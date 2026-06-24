CREATE TYPE "ScheduledTaskStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'RESCHEDULED', 'CANCELLED');

CREATE TYPE "ScheduledTaskType" AS ENUM ('CORRECTIVE_SERVICE', 'MACHINE_MAINTENANCE', 'COMPONENT_REPLACEMENT', 'INSPECTION_DIAGNOSIS', 'UPGRADE', 'FOLLOW_UP_VISIT', 'OTHER');

CREATE TABLE "ScheduledTask" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "machineId" TEXT NOT NULL,
  "ticketId" TEXT,
  "title" TEXT NOT NULL,
  "taskType" "ScheduledTaskType" NOT NULL,
  "description" TEXT,
  "scheduledStartAt" TIMESTAMP(3) NOT NULL,
  "scheduledEndAt" TIMESTAMP(3),
  "status" "ScheduledTaskStatus" NOT NULL DEFAULT 'SCHEDULED',
  "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
  "createdByUserId" TEXT NOT NULL,
  "completedByUserId" TEXT,
  "completedAt" TIMESTAMP(3),
  "internalRemarks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ScheduledTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduledTaskAssignment" (
  "id" TEXT NOT NULL,
  "scheduledTaskId" TEXT NOT NULL,
  "technicianId" TEXT NOT NULL,
  "assignedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScheduledTaskAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScheduledTaskAssignment_scheduledTaskId_technicianId_key" ON "ScheduledTaskAssignment"("scheduledTaskId", "technicianId");
CREATE INDEX "ScheduledTask_customerId_idx" ON "ScheduledTask"("customerId");
CREATE INDEX "ScheduledTask_machineId_idx" ON "ScheduledTask"("machineId");
CREATE INDEX "ScheduledTask_ticketId_idx" ON "ScheduledTask"("ticketId");
CREATE INDEX "ScheduledTask_status_idx" ON "ScheduledTask"("status");
CREATE INDEX "ScheduledTask_scheduledStartAt_idx" ON "ScheduledTask"("scheduledStartAt");
CREATE INDEX "ScheduledTask_createdByUserId_idx" ON "ScheduledTask"("createdByUserId");
CREATE INDEX "ScheduledTask_completedByUserId_idx" ON "ScheduledTask"("completedByUserId");
CREATE INDEX "ScheduledTask_machineId_scheduledStartAt_idx" ON "ScheduledTask"("machineId", "scheduledStartAt");
CREATE INDEX "ScheduledTask_ticketId_scheduledStartAt_idx" ON "ScheduledTask"("ticketId", "scheduledStartAt");
CREATE INDEX "ScheduledTask_status_scheduledStartAt_idx" ON "ScheduledTask"("status", "scheduledStartAt");
CREATE INDEX "ScheduledTaskAssignment_scheduledTaskId_idx" ON "ScheduledTaskAssignment"("scheduledTaskId");
CREATE INDEX "ScheduledTaskAssignment_technicianId_idx" ON "ScheduledTaskAssignment"("technicianId");
CREATE INDEX "ScheduledTaskAssignment_assignedByUserId_idx" ON "ScheduledTaskAssignment"("assignedByUserId");

ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduledTaskAssignment" ADD CONSTRAINT "ScheduledTaskAssignment_scheduledTaskId_fkey" FOREIGN KEY ("scheduledTaskId") REFERENCES "ScheduledTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduledTaskAssignment" ADD CONSTRAINT "ScheduledTaskAssignment_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduledTaskAssignment" ADD CONSTRAINT "ScheduledTaskAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
