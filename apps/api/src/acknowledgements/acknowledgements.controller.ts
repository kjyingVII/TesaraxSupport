import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser, Public, Roles } from "../auth/auth.decorators";
import { AcceptAcknowledgementDto } from "./dto/accept-acknowledgement.dto";
import { FollowUpAcknowledgementDto } from "./dto/follow-up-acknowledgement.dto";
import { SubmitAcknowledgementDto } from "./dto/submit-acknowledgement.dto";
import { AcknowledgementsService } from "./acknowledgements.service";

@Controller()
export class AcknowledgementsController {
  constructor(private readonly acknowledgementsService: AcknowledgementsService) {}

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  @Post("tickets/:ticketId/submit-for-acknowledgement")
  submitForAcknowledgement(
    @Param("ticketId") ticketId: string,
    @Body() dto: SubmitAcknowledgementDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.acknowledgementsService.submitForAcknowledgement(ticketId, dto, user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  @Post("service-reports/:serviceReportId/acknowledgement-link")
  createServiceReportAcknowledgementLink(
    @Param("serviceReportId") serviceReportId: string,
    @Body() dto: SubmitAcknowledgementDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.acknowledgementsService.createServiceReportAcknowledgementLink(serviceReportId, dto, user.id);
  }

  @Public()
  @Get("public/acknowledgements/:token")
  getPublicAcknowledgement(@Param("token") token: string) {
    return this.acknowledgementsService.getPublicAcknowledgement(token);
  }

  @Public()
  @Post("public/acknowledgements/:token/accept")
  accept(@Param("token") token: string, @Body() dto: AcceptAcknowledgementDto) {
    return this.acknowledgementsService.accept(token, dto);
  }

  @Public()
  @Post("public/acknowledgements/:token/follow-up")
  requestFollowUp(@Param("token") token: string, @Body() dto: FollowUpAcknowledgementDto) {
    return this.acknowledgementsService.requestFollowUp(token, dto);
  }
}
