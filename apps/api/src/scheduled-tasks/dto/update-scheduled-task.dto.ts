export type UpdateScheduledTaskDto = {
  customerId?: string;
  machineId?: string;
  ticketId?: string | null;
  title?: string;
  taskType?: string;
  description?: string | null;
  scheduledStartAt?: string;
  scheduledEndAt?: string | null;
  status?: string;
  priority?: string;
  notifyRecipientName?: string | null;
  notifyRecipientPhone?: string | null;
  notifyRecipientEmail?: string | null;
  assignedTechnicianIds?: string[];
  completedByUserId?: string | null;
  internalRemarks?: string | null;
};
