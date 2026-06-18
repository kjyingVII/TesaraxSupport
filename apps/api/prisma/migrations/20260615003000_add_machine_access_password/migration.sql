ALTER TABLE "Machine"
ADD COLUMN "machineAccessPasswordHash" TEXT,
ADD COLUMN "machineAccessPasswordUpdatedAt" TIMESTAMP(3);
