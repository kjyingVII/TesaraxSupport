import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { CreateScheduledTaskDto } from "./dto/create-scheduled-task.dto";
import { UpdateScheduledTaskDto } from "./dto/update-scheduled-task.dto";
import { ScheduledTasksService } from "./scheduled-tasks.service";

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
@Controller("scheduled-tasks")
export class ScheduledTasksController {
  constructor(private readonly scheduledTasksService: ScheduledTasksService) {}

  @Get()
  list(
    @Query("customerId") customerId?: string,
    @Query("machineId") machineId?: string,
    @Query("ticketId") ticketId?: string,
    @Query("technicianId") technicianId?: string,
    @Query("status") status?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.scheduledTasksService.list({
      customerId,
      machineId,
      ticketId,
      technicianId,
      status,
      dateFrom,
      dateTo,
      search,
      page,
      pageSize
    });
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.scheduledTasksService.getById(id);
  }

  @Post()
  create(@Body() dto: CreateScheduledTaskDto, @CurrentUser() user: { id: string }) {
    return this.scheduledTasksService.create(dto, user.id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateScheduledTaskDto, @CurrentUser() user: { id: string }) {
    return this.scheduledTasksService.update(id, dto, user.id);
  }

  @Patch(":id/cancel")
  cancel(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.scheduledTasksService.cancel(id, user.id);
  }

  @Patch(":id/complete")
  complete(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.scheduledTasksService.complete(id, user.id);
  }

  @Patch(":id/notify-reschedule")
  notifyRescheduled(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.scheduledTasksService.notifyRescheduled(id, user.id);
  }
}
