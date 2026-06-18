import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { UpsertServiceReportDto } from "./dto/upsert-service-report.dto";
import { ServiceReportsService } from "./service-reports.service";

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
@Controller()
export class ServiceReportsController {
  constructor(private readonly serviceReportsService: ServiceReportsService) {}

  @Post("tickets/:ticketId/service-report")
  upsertForTicket(
    @Param("ticketId") ticketId: string,
    @Body() dto: UpsertServiceReportDto,
    @CurrentUser() user: { id: string; role: UserRole }
  ) {
    return this.serviceReportsService.upsertForTicket(ticketId, dto, user);
  }

  @Get("service-reports/:id")
  getById(@Param("id") id: string) {
    return this.serviceReportsService.getById(id);
  }
}
