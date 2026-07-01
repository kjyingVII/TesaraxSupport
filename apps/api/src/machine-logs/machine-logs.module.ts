import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AttachmentsModule } from "../attachments/attachments.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { PrismaModule } from "../prisma/prisma.module";
import { MachineLogsController } from "./machine-logs.controller";
import { MachineLogsService } from "./machine-logs.service";

@Module({
  imports: [AttachmentsModule, AuditModule, NotificationsModule, PrismaModule],
  controllers: [MachineLogsController],
  providers: [MachineLogsService],
  exports: [MachineLogsService]
})
export class MachineLogsModule {}
