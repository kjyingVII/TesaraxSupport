import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/auth.decorators";
import { CreateMachineLogDto } from "./dto/create-machine-log.dto";
import { MachineLogsService } from "./machine-logs.service";

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
@Controller("machines/:machineId")
export class MachineLogsController {
  constructor(private readonly machineLogsService: MachineLogsService) {}

  @Get("logs")
  listLogs(
    @Param("machineId") machineId: string,
    @Query("logType") logType?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.machineLogsService.listLogs(machineId, {
      logType,
      dateFrom,
      dateTo,
      search,
      page,
      pageSize
    });
  }

  @Post("logs")
  createLog(@Param("machineId") machineId: string, @Body() dto: CreateMachineLogDto) {
    return this.machineLogsService.createLog(machineId, dto);
  }

  @Get("logs/:logId")
  getLogById(@Param("machineId") machineId: string, @Param("logId") logId: string) {
    return this.machineLogsService.getLogById(machineId, logId);
  }

  @Get("timeline")
  getTimeline(
    @Param("machineId") machineId: string,
    @Query("type") type?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.machineLogsService.getTimeline(machineId, {
      type,
      dateFrom,
      dateTo,
      search,
      page,
      pageSize
    });
  }
}
