import { UploadTicketAttachmentDto } from "../../attachments/dto/upload-ticket-attachment.dto";

export type CreateTicketCommentDto = {
  comment?: string;
  visibility?: string;
  attachments?: UploadTicketAttachmentDto[];
};
