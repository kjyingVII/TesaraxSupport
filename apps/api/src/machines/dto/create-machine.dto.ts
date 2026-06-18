export type CreateMachineDto = {
  customerId?: string;
  machineName?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  serviceReminderIntervalDays?: number;
  nextServiceDueAt?: string;
  installationDate?: string;
  warrantyExpiryDate?: string;
  internalRemarks?: string;
  machineAccessPassword?: string;
};
