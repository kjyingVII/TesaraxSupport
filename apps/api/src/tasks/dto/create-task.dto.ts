export type CreateTaskDto = {
  customerId?: string;
  machineId?: string;
  ticketId?: string | null;
  title?: string;
  taskType?: string;
  description?: string | null;
  scheduledStartAt?: string;
  scheduledEndAt?: string | null;
  status?: string;
  visibility?: string;
  priority?: string;
  notifyUser?: boolean;
  notifyRecipientName?: string | null;
  notifyRecipientPhone?: string | null;
  notifyRecipientEmail?: string | null;
  assignedTechnicianIds?: string[];
  internalRemarks?: string | null;
};
