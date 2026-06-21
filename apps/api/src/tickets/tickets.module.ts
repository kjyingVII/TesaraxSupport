import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AttachmentsModule } from "../attachments/attachments.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SettingsModule } from "../settings/settings.module";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";

@Module({
  imports: [AuditModule, AttachmentsModule, NotificationsModule, SettingsModule],
  controllers: [TicketsController],
  providers: [TicketsService]
})
export class TicketsModule {}
