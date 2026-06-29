import { Controller, Get, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { DashboardService } from "./dashboard.service";

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("work")
  getWorkDashboard(
    @CurrentUser() user: { id: string },
    @Query("scope") scope?: string,
    @Query("search") search?: string
  ) {
    return this.dashboardService.getWorkDashboard({
      userId: user.id,
      scope,
      search
    });
  }
}
