import { UploadTicketAttachmentDto } from "../../attachments/dto/upload-ticket-attachment.dto";

export type CreatePublicTicketCommentDto = {
  requesterName?: string;
  requesterPhone?: string;
  requesterEmail?: string;
  comment?: string;
  attachments?: UploadTicketAttachmentDto[];
};
