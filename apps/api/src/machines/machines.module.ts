import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { SettingsModule } from "../settings/settings.module";
import { MachinesController } from "./machines.controller";
import { MachinesService } from "./machines.service";

@Module({
  imports: [AuditModule, AuthModule, SettingsModule],
  controllers: [MachinesController],
  providers: [MachinesService]
})
export class MachinesModule {}
