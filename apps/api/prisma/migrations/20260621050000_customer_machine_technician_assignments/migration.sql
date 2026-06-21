CREATE TABLE "CustomerTechnicianAssignment" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "technicianId" TEXT NOT NULL,
  "assignedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CustomerTechnicianAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MachineTechnicianAssignment" (
  "id" TEXT NOT NULL,
  "machineId" TEXT NOT NULL,
  "technicianId" TEXT NOT NULL,
  "assignedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MachineTechnicianAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerTechnicianAssignment_customerId_technicianId_key"
  ON "CustomerTechnicianAssignment"("customerId", "technicianId");
CREATE INDEX "CustomerTechnicianAssignment_customerId_idx" ON "CustomerTechnicianAssignment"("customerId");
CREATE INDEX "CustomerTechnicianAssignment_technicianId_idx" ON "CustomerTechnicianAssignment"("technicianId");
CREATE INDEX "CustomerTechnicianAssignment_assignedByUserId_idx" ON "CustomerTechnicianAssignment"("assignedByUserId");

CREATE UNIQUE INDEX "MachineTechnicianAssignment_machineId_technicianId_key"
  ON "MachineTechnicianAssignment"("machineId", "technicianId");
CREATE INDEX "MachineTechnicianAssignment_machineId_idx" ON "MachineTechnicianAssignment"("machineId");
CREATE INDEX "MachineTechnicianAssignment_technicianId_idx" ON "MachineTechnicianAssignment"("technicianId");
CREATE INDEX "MachineTechnicianAssignment_assignedByUserId_idx" ON "MachineTechnicianAssignment"("assignedByUserId");

ALTER TABLE "CustomerTechnicianAssignment"
  ADD CONSTRAINT "CustomerTechnicianAssignment_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerTechnicianAssignment"
  ADD CONSTRAINT "CustomerTechnicianAssignment_technicianId_fkey"
  FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerTechnicianAssignment"
  ADD CONSTRAINT "CustomerTechnicianAssignment_assignedByUserId_fkey"
  FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MachineTechnicianAssignment"
  ADD CONSTRAINT "MachineTechnicianAssignment_machineId_fkey"
  FOREIGN KEY ("machineId") REFERENCES "Machine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MachineTechnicianAssignment"
  ADD CONSTRAINT "MachineTechnicianAssignment_technicianId_fkey"
  FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MachineTechnicianAssignment"
  ADD CONSTRAINT "MachineTechnicianAssignment_assignedByUserId_fkey"
  FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
