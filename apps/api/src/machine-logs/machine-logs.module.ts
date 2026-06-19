import { Module } from "@nestjs/common";
import { AttachmentsModule } from "../attachments/attachments.module";
import { PrismaModule } from "../prisma/prisma.module";
import { MachineLogsController } from "./machine-logs.controller";
import { MachineLogsService } from "./machine-logs.service";

@Module({
  imports: [AttachmentsModule, PrismaModule],
  controllers: [MachineLogsController],
  providers: [MachineLogsService],
  exports: [MachineLogsService]
})
export class MachineLogsModule {}
