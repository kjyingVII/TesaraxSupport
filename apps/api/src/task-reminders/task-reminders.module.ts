import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { SettingsModule } from "../settings/settings.module";
import { TaskRemindersService } from "./task-reminders.service";

@Module({
  imports: [NotificationsModule, SettingsModule],
  providers: [TaskRemindersService]
})
export class TaskRemindersModule {}
