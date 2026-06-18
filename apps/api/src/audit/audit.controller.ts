import { Controller, Get, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/auth.decorators";
import { AuditService } from "./audit.service";

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
@Controller("admin/audit-logs")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @Query("action") action?: string,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
    @Query("actorUserId") actorUserId?: string,
    @Query("actorRequesterName") actorRequesterName?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.auditService.list({
      action,
      entityType,
      entityId,
      actorUserId,
      actorRequesterName,
      page,
      pageSize
    });
  }
}
