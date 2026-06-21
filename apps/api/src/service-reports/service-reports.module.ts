import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ServiceReportsController } from "./service-reports.controller";
import { ServiceReportsService } from "./service-reports.service";

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [ServiceReportsController],
  providers: [ServiceReportsService]
})
export class ServiceReportsModule {}
