import { UploadTicketAttachmentDto } from "../../attachments/dto/upload-ticket-attachment.dto";

export type CreatePublicTicketDto = {
  requesterName?: string;
  requesterCompany?: string;
  requesterDepartment?: string;
  requesterPhone?: string;
  requesterEmail?: string;
  issueTitle?: string;
  issueDescription?: string;
  issueCategory?: string;
  priority?: string;
  attachments?: UploadTicketAttachmentDto[];
};
