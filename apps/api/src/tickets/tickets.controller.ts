import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { AssignTicketDto } from "./dto/assign-ticket.dto";
import { CreateTicketCommentDto } from "./dto/create-ticket-comment.dto";
import { UpdateTicketAssignmentsDto } from "./dto/update-ticket-assignments.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";
import { TicketsService } from "./tickets.service";

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
@Controller("tickets")
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  list(
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("customerId") customerId?: string,
    @Query("machineId") machineId?: string,
    @Query("assignedTechnicianId") assignedTechnicianId?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.ticketsService.list({
      status,
      priority,
      customerId,
      machineId,
      assignedTechnicianId,
      dateFrom,
      dateTo,
      search,
      page,
      pageSize
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  @Get("technicians")
  listTechnicians() {
    return this.ticketsService.listTechnicians();
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.ticketsService.getById(id);
  }

  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateTicketStatusDto, @CurrentUser() user: { id: string }) {
    return this.ticketsService.updateStatus(id, dto, user.id);
  }

  @Patch(":id/assign")
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  assign(@Param("id") id: string, @Body() dto: AssignTicketDto, @CurrentUser() user: { id: string }) {
    return this.ticketsService.assign(id, { ...dto, assignedByUserId: dto.assignedByUserId ?? user.id });
  }

  @Patch(":id/assignments")
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  updateAssignments(
    @Param("id") id: string,
    @Body() dto: UpdateTicketAssignmentsDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.ticketsService.updateAssignments(id, dto, user.id);
  }

  @Post(":id/comments")
  createComment(@Param("id") id: string, @Body() dto: CreateTicketCommentDto, @CurrentUser() user: { id: string }) {
    return this.ticketsService.createComment(id, dto, user.id);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  delete(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.ticketsService.delete(id, user.id);
  }
}
