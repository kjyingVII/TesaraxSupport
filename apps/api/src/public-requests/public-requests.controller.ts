import { Body, Controller, Get, Header, Headers, Ip, Param, Post, Query, Res } from "@nestjs/common";
import { AcceptAcknowledgementDto } from "../acknowledgements/dto/accept-acknowledgement.dto";
import { FollowUpAcknowledgementDto } from "../acknowledgements/dto/follow-up-acknowledgement.dto";
import { Public } from "../auth/auth.decorators";
import { CreateMachineLogDto } from "../machine-logs/dto/create-machine-log.dto";
import { CreatePublicTicketCommentDto } from "./dto/create-public-ticket-comment.dto";
import { CreatePublicTicketDto } from "./dto/create-public-ticket.dto";
import { RequestMachineAccessDto } from "./dto/request-machine-access.dto";
import { PublicRequestsService } from "./public-requests.service";

@Public()
@Controller("public/machines")
export class PublicRequestsController {
  constructor(private readonly publicRequestsService: PublicRequestsService) {}

  @Get(":publicId/request")
  getRequestMachine(@Param("publicId") publicId: string, @Headers("authorization") authorization?: string) {
    return this.publicRequestsService.getRequestMachine(publicId, authorization);
  }

  @Post(":publicId/access")
  requestMachineAccess(
    @Param("publicId") publicId: string,
    @Body() dto: RequestMachineAccessDto,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.publicRequestsService.requestMachineAccess(publicId, dto, { ipAddress, userAgent });
  }

  @Get(":publicId/portal")
  getMachinePortal(
    @Param("publicId") publicId: string,
    @Headers("authorization") authorization?: string,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.publicRequestsService.getMachinePortal(publicId, authorization, { ipAddress, userAgent });
  }

  @Post(":publicId/tickets")
  createTicket(@Param("publicId") publicId: string, @Body() dto: CreatePublicTicketDto, @Headers("authorization") authorization?: string) {
    return this.publicRequestsService.createTicket(publicId, dto, authorization);
  }

  @Post(":publicId/logs")
  createMachineLog(
    @Param("publicId") publicId: string,
    @Body() dto: CreateMachineLogDto,
    @Headers("authorization") authorization?: string,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.publicRequestsService.createMachineLog(publicId, dto, authorization, { ipAddress, userAgent });
  }

  @Get(":publicId/logs/:logId")
  getMachineLog(
    @Param("publicId") publicId: string,
    @Param("logId") logId: string,
    @Headers("authorization") authorization?: string,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.publicRequestsService.getMachineLog(publicId, logId, authorization, { ipAddress, userAgent });
  }

  @Post(":publicId/logs/:logId/acknowledgement/accept")
  acceptMachineLogAcknowledgement(
    @Param("publicId") publicId: string,
    @Param("logId") logId: string,
    @Body() dto: AcceptAcknowledgementDto,
    @Headers("authorization") authorization?: string,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.publicRequestsService.acceptMachineLogAcknowledgement(publicId, logId, dto, authorization, {
      ipAddress,
      userAgent
    });
  }

  @Get(":publicId/logs/:logId/attachments/:attachmentId/download")
  @Header("Cache-Control", "private, max-age=300")
  async downloadMachineLogAttachment(
    @Param("publicId") publicId: string,
    @Param("logId") logId: string,
    @Param("attachmentId") attachmentId: string,
    @Headers("authorization") authorization: string | undefined,
    @Query("accessToken") accessToken: string | undefined,
    @Res() response: any
  ) {
    const { attachment, stream } = await this.publicRequestsService.getMachineLogAttachmentDownload(
      publicId,
      logId,
      attachmentId,
      authorization ?? (accessToken ? `Bearer ${accessToken}` : undefined)
    );
    response.setHeader("Content-Type", attachment.contentType);
    response.setHeader("Content-Length", String(attachment.fileSizeBytes));
    response.setHeader("Content-Disposition", `attachment; filename="${attachment.originalFileName.replace(/"/g, "")}"`);
    stream.pipe(response);
  }

  @Get(":publicId/tickets/:ticketId")
  getMachineTicket(
    @Param("publicId") publicId: string,
    @Param("ticketId") ticketId: string,
    @Headers("authorization") authorization?: string,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.publicRequestsService.getMachineTicket(publicId, ticketId, authorization, { ipAddress, userAgent });
  }

  @Post(":publicId/tickets/:ticketId/comments")
  createMachineTicketComment(
    @Param("publicId") publicId: string,
    @Param("ticketId") ticketId: string,
    @Body() dto: CreatePublicTicketCommentDto,
    @Headers("authorization") authorization?: string,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.publicRequestsService.createMachineTicketComment(publicId, ticketId, dto, authorization, { ipAddress, userAgent });
  }

  @Post(":publicId/tickets/:ticketId/acknowledgement/accept")
  acceptMachineTicketAcknowledgement(
    @Param("publicId") publicId: string,
    @Param("ticketId") ticketId: string,
    @Body() dto: AcceptAcknowledgementDto,
    @Headers("authorization") authorization?: string,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.publicRequestsService.acceptMachineTicketAcknowledgement(publicId, ticketId, dto, authorization, {
      ipAddress,
      userAgent
    });
  }

  @Post(":publicId/tickets/:ticketId/acknowledgement/follow-up")
  requestMachineTicketAcknowledgementFollowUp(
    @Param("publicId") publicId: string,
    @Param("ticketId") ticketId: string,
    @Body() dto: FollowUpAcknowledgementDto,
    @Headers("authorization") authorization?: string,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.publicRequestsService.requestMachineTicketAcknowledgementFollowUp(publicId, ticketId, dto, authorization, {
      ipAddress,
      userAgent
    });
  }

  @Post(":publicId/tickets/:ticketId/service-reports/:serviceReportId/acknowledgement/accept")
  acceptMachineServiceReportAcknowledgement(
    @Param("publicId") publicId: string,
    @Param("ticketId") ticketId: string,
    @Param("serviceReportId") serviceReportId: string,
    @Body() dto: AcceptAcknowledgementDto,
    @Headers("authorization") authorization?: string,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.publicRequestsService.acceptMachineServiceReportAcknowledgement(publicId, ticketId, serviceReportId, dto, authorization, {
      ipAddress,
      userAgent
    });
  }

  @Post(":publicId/tickets/:ticketId/service-reports/:serviceReportId/acknowledgement/follow-up")
  requestMachineServiceReportAcknowledgementFollowUp(
    @Param("publicId") publicId: string,
    @Param("ticketId") ticketId: string,
    @Param("serviceReportId") serviceReportId: string,
    @Body() dto: FollowUpAcknowledgementDto,
    @Headers("authorization") authorization?: string,
    @Ip() ipAddress?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    return this.publicRequestsService.requestMachineServiceReportAcknowledgementFollowUp(publicId, ticketId, serviceReportId, dto, authorization, {
      ipAddress,
      userAgent
    });
  }

  @Get(":publicId/tickets/:ticketId/attachments/:attachmentId/download")
  @Header("Cache-Control", "private, max-age=300")
  async downloadMachineTicketAttachment(
    @Param("publicId") publicId: string,
    @Param("ticketId") ticketId: string,
    @Param("attachmentId") attachmentId: string,
    @Headers("authorization") authorization: string | undefined,
    @Res() response: any
  ) {
    const { attachment, stream } = await this.publicRequestsService.getMachineTicketAttachmentDownload(
      publicId,
      ticketId,
      attachmentId,
      authorization
    );
    response.setHeader("Content-Type", attachment.contentType);
    response.setHeader("Content-Length", String(attachment.fileSizeBytes));
    response.setHeader("Content-Disposition", `attachment; filename="${attachment.originalFileName.replace(/"/g, "")}"`);
    stream.pipe(response);
  }

  @Get(":publicId/documents/:attachmentId/download")
  @Header("Cache-Control", "private, max-age=300")
  async downloadMachineDocument(
    @Param("publicId") publicId: string,
    @Param("attachmentId") attachmentId: string,
    @Headers("authorization") authorization: string | undefined,
    @Res() response: any
  ) {
    const { attachment, stream } = await this.publicRequestsService.getMachineDocumentDownload(
      publicId,
      attachmentId,
      authorization
    );
    response.setHeader("Content-Type", attachment.contentType);
    response.setHeader("Content-Length", String(attachment.fileSizeBytes));
    response.setHeader("Content-Disposition", `attachment; filename="${attachment.originalFileName.replace(/"/g, "")}"`);
    stream.pipe(response);
  }

  @Post("tickets/:ticketId/comments/list")
  listTicketComments(@Param("ticketId") ticketId: string, @Body() dto: CreatePublicTicketCommentDto) {
    return this.publicRequestsService.listTicketComments(ticketId, dto);
  }

  @Post("tickets/:ticketId/comments")
  createTicketComment(@Param("ticketId") ticketId: string, @Body() dto: CreatePublicTicketCommentDto) {
    return this.publicRequestsService.createTicketComment(ticketId, dto);
  }
}
