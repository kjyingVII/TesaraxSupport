ALTER TABLE "MachineLog" ADD COLUMN "title" TEXT;

UPDATE "MachineLog"
SET "title" = LEFT(NULLIF(TRIM("workSummary"), ''), 120);

UPDATE "MachineLog"
SET "title" = 'Machine log'
WHERE "title" IS NULL OR TRIM("title") = '';

ALTER TABLE "MachineLog" ALTER COLUMN "title" SET NOT NULL;

CREATE INDEX "MachineLog_title_idx" ON "MachineLog"("title");
