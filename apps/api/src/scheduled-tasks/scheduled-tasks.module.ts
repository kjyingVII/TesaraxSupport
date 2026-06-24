import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ScheduledTasksController } from "./scheduled-tasks.controller";
import { ScheduledTasksService } from "./scheduled-tasks.service";

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [ScheduledTasksController],
  providers: [ScheduledTasksService],
  exports: [ScheduledTasksService]
})
export class ScheduledTasksModule {}
