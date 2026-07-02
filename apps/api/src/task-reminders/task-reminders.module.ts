import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { SettingsModule } from "../settings/settings.module";
import { TaskRemindersController } from "./task-reminders.controller";
import { TaskRemindersService } from "./task-reminders.service";

@Module({
  imports: [NotificationsModule, SettingsModule],
  controllers: [TaskRemindersController],
  providers: [TaskRemindersService]
})
export class TaskRemindersModule {}
