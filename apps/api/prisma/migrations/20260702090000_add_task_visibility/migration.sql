CREATE TYPE "TaskVisibility" AS ENUM ('TEAM', 'PRIVATE');

ALTER TABLE "Task" ADD COLUMN "visibility" "TaskVisibility" NOT NULL DEFAULT 'TEAM';

CREATE INDEX "Task_visibility_idx" ON "Task"("visibility");
CREATE INDEX "Task_visibility_scheduledStartAt_idx" ON "Task"("visibility", "scheduledStartAt");
