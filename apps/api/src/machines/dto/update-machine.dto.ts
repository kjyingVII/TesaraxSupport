export type UpdateMachineDto = {
  customerId?: string;
  machineName?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  serviceReminderIntervalDays?: number;
  lastServiceAt?: string | null;
  nextServiceDueAt?: string | null;
  installationDate?: string | null;
  warrantyExpiryDate?: string | null;
  internalRemarks?: string | null;
  isActive?: boolean;
  machineAccessPassword?: string | null;
};
