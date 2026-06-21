import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { CreateMachineDto } from "./dto/create-machine.dto";
import { UpdateMachineDto } from "./dto/update-machine.dto";
import { UpdateMachineTechniciansDto } from "./dto/update-machine-technicians.dto";
import { UpdateServiceReminderDto } from "./dto/update-service-reminder.dto";
import { MachinesService } from "./machines.service";

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
@Controller("machines")
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  list(
    @Query("customerId") customerId?: string,
    @Query("search") search?: string,
    @Query("isActive") isActive?: string,
    @Query("serviceStatus") serviceStatus?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.machinesService.list({
      customerId,
      search,
      isActive,
      serviceStatus,
      page,
      pageSize
    });
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  create(@Body() dto: CreateMachineDto) {
    return this.machinesService.create(dto);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.machinesService.getById(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  update(@Param("id") id: string, @Body() dto: UpdateMachineDto, @CurrentUser() user: { id: string }) {
    return this.machinesService.update(id, dto, user.id);
  }

  @Get(":id/technicians")
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  listTechnicians(@Param("id") id: string) {
    return this.machinesService.listTechnicians(id);
  }

  @Patch(":id/technicians")
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  updateTechnicians(
    @Param("id") id: string,
    @Body() dto: UpdateMachineTechniciansDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.machinesService.updateTechnicians(id, dto, user.id);
  }

  @Get(":id/qr-code")
  getQrCode(@Param("id") id: string) {
    return this.machinesService.getQrCode(id);
  }

  @Patch(":id/service-reminder")
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  updateServiceReminder(@Param("id") id: string, @Body() dto: UpdateServiceReminderDto, @CurrentUser() user: { id: string }) {
    return this.machinesService.updateServiceReminder(id, dto, user.id);
  }
}
