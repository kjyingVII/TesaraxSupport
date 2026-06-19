import { UploadTicketAttachmentDto } from "../../attachments/dto/upload-ticket-attachment.dto";

export type CreateMachineLogDto = {
  activityType?: string;
  workDate?: string;
  workEndAt?: string | null;
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
