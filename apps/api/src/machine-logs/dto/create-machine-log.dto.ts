import { UploadTicketAttachmentDto } from "../../attachments/dto/upload-ticket-attachment.dto";

export type CreateMachineLogDto = {
  activityType?: string;
  workDate?: string;
  workEndAt?: string | null;
  title?: string;
  workSummary?: string;
  partsUsed?: string;
  upgradeVersion?: string;
  upgradeDescription?: string;
  ticketId?: string;
  serviceReportId?: string;
  nextServiceDueOverrideAt?: string | null;
  requesterConfirmedName?: string;
  requesterContactPhone?: string;
  requesterContactEmail?: string;
  requesterAcknowledgementRequired?: boolean;
  requesterConfirmedAt?: string;
  notifyCustomer?: boolean;
  notifyRecipientName?: string;
  notifyRecipientPhone?: string;
  notifyRecipientEmail?: string;
  notifyMessage?: string;
  loggedByUserId?: string;
  loggedByRequesterName?: string;
  attachments?: UploadTicketAttachmentDto[];
};
