import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TasksService } from "./tasks.service";

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

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
    return this.tasksService.list({
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
    return this.tasksService.getById(id);
  }

  @Get(":id/comments")
  listComments(@Param("id") id: string) {
    return this.tasksService.listComments(id);
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: { id: string }) {
    return this.tasksService.create(dto, user.id);
  }

  @Post(":id/comments")
  createComment(@Param("id") id: string, @Body() dto: { comment?: string }, @CurrentUser() user: { id: string }) {
    return this.tasksService.createComment(id, dto, user.id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: { id: string }) {
    return this.tasksService.update(id, dto, user.id);
  }

  @Patch(":id/cancel")
  cancel(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.tasksService.cancel(id, user.id);
  }

  @Patch(":id/complete")
  complete(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.tasksService.complete(id, user.id);
  }

  @Patch(":id/notify-reschedule")
  notifyRescheduled(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.tasksService.notifyRescheduled(id, user.id);
  }
}
