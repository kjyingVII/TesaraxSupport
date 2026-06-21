import { Controller, Get, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/auth.decorators";
import { NotificationsService } from "./notifications.service";

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
@Controller("admin/notification-logs")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @Query("channel") channel?: string,
    @Query("status") status?: string,
    @Query("relatedType") relatedType?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.notificationsService.list({
      channel,
      status,
      relatedType,
      search,
      page,
      pageSize
    });
  }
}
