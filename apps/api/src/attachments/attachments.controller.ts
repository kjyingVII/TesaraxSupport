import { Body, Controller, Delete, Get, Header, Param, Post, Res } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { AttachmentsService } from "./attachments.service";
import { UploadTicketAttachmentDto } from "./dto/upload-ticket-attachment.dto";

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
@Controller()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get("tickets/:ticketId/attachments")
  listTicketAttachments(@Param("ticketId") ticketId: string) {
    return this.attachmentsService.listTicketAttachments(ticketId);
  }

  @Post("tickets/:ticketId/attachments")
  uploadTicketAttachment(
    @Param("ticketId") ticketId: string,
    @Body() dto: UploadTicketAttachmentDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.attachmentsService.uploadTicketAttachment(ticketId, dto, user.id);
  }

  @Get("service-reports/:serviceReportId/attachments")
  listServiceReportAttachments(@Param("serviceReportId") serviceReportId: string) {
    return this.attachmentsService.listServiceReportAttachments(serviceReportId);
  }

  @Post("service-reports/:serviceReportId/attachments")
  uploadServiceReportAttachment(
    @Param("serviceReportId") serviceReportId: string,
    @Body() dto: UploadTicketAttachmentDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.attachmentsService.uploadServiceReportAttachment(serviceReportId, dto, user.id);
  }

  @Get("machines/:machineId/documents")
  listMachineDocuments(@Param("machineId") machineId: string) {
    return this.attachmentsService.listMachineDocuments(machineId);
  }

  @Post("machines/:machineId/documents")
  uploadMachineDocument(
    @Param("machineId") machineId: string,
    @Body() dto: UploadTicketAttachmentDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.attachmentsService.uploadMachineDocument(machineId, dto, user.id);
  }

  @Post("machines/:machineId/support-company-logo")
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  uploadMachineSupportCompanyLogo(
    @Param("machineId") machineId: string,
    @Body() dto: UploadTicketAttachmentDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.attachmentsService.uploadMachineSupportCompanyLogo(machineId, dto, user.id);
  }

  @Delete("machines/:machineId/support-company-logo")
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  clearMachineSupportCompanyLogo(@Param("machineId") machineId: string) {
    return this.attachmentsService.clearMachineSupportCompanyLogo(machineId);
  }

  @Get("attachments/:id/download")
  @Header("Cache-Control", "private, max-age=300")
  async downloadAttachment(@Param("id") id: string, @Res() response: any) {
    const { attachment, stream } = await this.attachmentsService.getDownload(id);
    response.setHeader("Content-Type", attachment.contentType);
    response.setHeader("Content-Length", String(attachment.fileSizeBytes));
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${attachment.originalFileName.replace(/"/g, "")}"`
    );
    stream.pipe(response);
  }
}
