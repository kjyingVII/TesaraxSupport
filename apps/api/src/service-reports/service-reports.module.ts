import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ServiceReportsController } from "./service-reports.controller";
import { ServiceReportsService } from "./service-reports.service";

@Module({
  imports: [AuditModule],
  controllers: [ServiceReportsController],
  providers: [ServiceReportsService]
})
export class ServiceReportsModule {}
