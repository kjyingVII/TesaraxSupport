import { Module } from "@nestjs/common";
import { AttachmentsModule } from "../attachments/attachments.module";
import { AuditModule } from "../audit/audit.module";
import { AcknowledgementsController } from "./acknowledgements.controller";
import { AcknowledgementsService } from "./acknowledgements.service";

@Module({
  imports: [AuditModule, AttachmentsModule],
  controllers: [AcknowledgementsController],
  providers: [AcknowledgementsService]
})
export class AcknowledgementsModule {}
