CREATE TYPE "MachineActivityType" AS ENUM (
    'CORRECTIVE_SERVICE',
    'MACHINE_MAINTENANCE',
    'COMPONENT_REPLACEMENT',
    'INSPECTION_DIAGNOSIS',
    'UPGRADE',
    'OTHER'
);

ALTER TABLE "MachineLog" ADD COLUMN "activityType" "MachineActivityType";

UPDATE "MachineLog"
SET "activityType" =
    CASE
        WHEN "logType" = 'UPGRADE' THEN 'UPGRADE'::"MachineActivityType"
        WHEN "serviceType" IS NOT NULL THEN ("serviceType"::text)::"MachineActivityType"
        ELSE 'CORRECTIVE_SERVICE'::"MachineActivityType"
    END;

ALTER TABLE "MachineLog" ALTER COLUMN "activityType" SET NOT NULL;

DROP INDEX IF EXISTS "MachineLog_logType_idx";
DROP INDEX IF EXISTS "MachineLog_serviceType_idx";

ALTER TABLE "MachineLog" DROP COLUMN "logType";
ALTER TABLE "MachineLog" DROP COLUMN "serviceType";
ALTER TABLE "Machine" DROP COLUMN "lastUpgradeAt";

DROP TYPE "MachineLogType";
DROP TYPE "MachineServiceType";

CREATE INDEX "MachineLog_activityType_idx" ON "MachineLog"("activityType");
