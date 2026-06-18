CREATE TYPE "MachineServiceType" AS ENUM (
    'CORRECTIVE_SERVICE',
    'MACHINE_MAINTENANCE',
    'COMPONENT_REPLACEMENT',
    'INSPECTION_DIAGNOSIS',
    'OTHER'
);

ALTER TABLE "MachineLog" ADD COLUMN "serviceType" "MachineServiceType";

UPDATE "MachineLog"
SET "serviceType" = 'CORRECTIVE_SERVICE'
WHERE "logType" = 'SERVICE' AND "serviceType" IS NULL;

CREATE INDEX "MachineLog_serviceType_idx" ON "MachineLog"("serviceType");
