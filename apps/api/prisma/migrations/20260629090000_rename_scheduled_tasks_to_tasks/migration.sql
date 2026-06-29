ALTER TYPE "ScheduledTaskStatus" RENAME TO "TaskStatus";
ALTER TYPE "ScheduledTaskType" RENAME TO "TaskType";

ALTER TABLE "ScheduledTaskAssignment" DROP CONSTRAINT IF EXISTS "ScheduledTaskAssignment_scheduledTaskId_fkey";
ALTER TABLE "ScheduledTaskAssignment" DROP CONSTRAINT IF EXISTS "ScheduledTaskAssignment_technicianId_fkey";
ALTER TABLE "ScheduledTaskAssignment" DROP CONSTRAINT IF EXISTS "ScheduledTaskAssignment_assignedByUserId_fkey";
ALTER TABLE "ScheduledTask" DROP CONSTRAINT IF EXISTS "ScheduledTask_customerId_fkey";
ALTER TABLE "ScheduledTask" DROP CONSTRAINT IF EXISTS "ScheduledTask_machineId_fkey";
ALTER TABLE "ScheduledTask" DROP CONSTRAINT IF EXISTS "ScheduledTask_ticketId_fkey";
ALTER TABLE "ScheduledTask" DROP CONSTRAINT IF EXISTS "ScheduledTask_createdByUserId_fkey";
ALTER TABLE "ScheduledTask" DROP CONSTRAINT IF EXISTS "ScheduledTask_completedByUserId_fkey";

ALTER TABLE "ScheduledTask" RENAME TO "Task";
ALTER TABLE "ScheduledTaskAssignment" RENAME TO "TaskAssignment";
ALTER TABLE "TaskAssignment" RENAME COLUMN "scheduledTaskId" TO "taskId";

ALTER TABLE "Task" RENAME CONSTRAINT "ScheduledTask_pkey" TO "Task_pkey";
ALTER TABLE "TaskAssignment" RENAME CONSTRAINT "ScheduledTaskAssignment_pkey" TO "TaskAssignment_pkey";

ALTER INDEX IF EXISTS "ScheduledTaskAssignment_scheduledTaskId_technicianId_key" RENAME TO "TaskAssignment_taskId_technicianId_key";
ALTER INDEX IF EXISTS "ScheduledTask_customerId_idx" RENAME TO "Task_customerId_idx";
ALTER INDEX IF EXISTS "ScheduledTask_machineId_idx" RENAME TO "Task_machineId_idx";
ALTER INDEX IF EXISTS "ScheduledTask_ticketId_idx" RENAME TO "Task_ticketId_idx";
ALTER INDEX IF EXISTS "ScheduledTask_status_idx" RENAME TO "Task_status_idx";
ALTER INDEX IF EXISTS "ScheduledTask_scheduledStartAt_idx" RENAME TO "Task_scheduledStartAt_idx";
ALTER INDEX IF EXISTS "ScheduledTask_notifyRecipientPhone_idx" RENAME TO "Task_notifyRecipientPhone_idx";
ALTER INDEX IF EXISTS "ScheduledTask_createdByUserId_idx" RENAME TO "Task_createdByUserId_idx";
ALTER INDEX IF EXISTS "ScheduledTask_completedByUserId_idx" RENAME TO "Task_completedByUserId_idx";
ALTER INDEX IF EXISTS "ScheduledTask_machineId_scheduledStartAt_idx" RENAME TO "Task_machineId_scheduledStartAt_idx";
ALTER INDEX IF EXISTS "ScheduledTask_ticketId_scheduledStartAt_idx" RENAME TO "Task_ticketId_scheduledStartAt_idx";
ALTER INDEX IF EXISTS "ScheduledTask_status_scheduledStartAt_idx" RENAME TO "Task_status_scheduledStartAt_idx";
ALTER INDEX IF EXISTS "ScheduledTaskAssignment_scheduledTaskId_idx" RENAME TO "TaskAssignment_taskId_idx";
ALTER INDEX IF EXISTS "ScheduledTaskAssignment_technicianId_idx" RENAME TO "TaskAssignment_technicianId_idx";
ALTER INDEX IF EXISTS "ScheduledTaskAssignment_assignedByUserId_idx" RENAME TO "TaskAssignment_assignedByUserId_idx";

ALTER TABLE "Task" ADD CONSTRAINT "Task_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TaskComment" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "comment" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskComment_taskId_idx" ON "TaskComment"("taskId");
CREATE INDEX "TaskComment_createdByUserId_idx" ON "TaskComment"("createdByUserId");
CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "TaskComment"("taskId", "createdAt");

ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
