import { UploadTicketAttachmentDto } from "../../attachments/dto/upload-ticket-attachment.dto";

export type CreateMachineLogDto = {
  logType?: string;
  workDate?: string;
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
  requesterConfirmedAt?: string;
  loggedByUserId?: string;
  loggedByRequesterName?: string;
  attachments?: UploadTicketAttachmentDto[];
};
