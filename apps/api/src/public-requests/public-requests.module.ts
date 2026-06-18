import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AttachmentsModule } from "../attachments/attachments.module";
import { AuthModule } from "../auth/auth.module";
import { SettingsModule } from "../settings/settings.module";
import { PublicRequestsController } from "./public-requests.controller";
import { PublicRequestsService } from "./public-requests.service";

@Module({
  imports: [AttachmentsModule, AuditModule, AuthModule, SettingsModule],
  controllers: [PublicRequestsController],
  providers: [PublicRequestsService]
})
export class PublicRequestsModule {}
