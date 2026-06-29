CREATE TYPE "TaskStatus_new" AS ENUM (
  'PENDING',
  'SCHEDULED',
  'IN_PROGRESS',
  'WAITING_COMPONENT',
  'WAITING_CUSTOMER',
  'COMPLETED',
  'CANCELLED'
);

ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;
UPDATE "Task" SET "status" = 'SCHEDULED' WHERE "status"::text = 'RESCHEDULED';
ALTER TABLE "Task" ALTER COLUMN "status" TYPE "TaskStatus_new" USING ("status"::text::"TaskStatus_new");
DROP TYPE "TaskStatus";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";

ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "Task" ALTER COLUMN "scheduledStartAt" DROP NOT NULL;
