import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { AcknowledgementsModule } from "./acknowledgements/acknowledgements.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuditModule } from "./audit/audit.module";
import { AttachmentsModule } from "./attachments/attachments.module";
import { AuthModule } from "./auth/auth.module";
import { ApiAuthGuard } from "./auth/auth.guard";
import { CustomersModule } from "./customers/customers.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { MachineLogsModule } from "./machine-logs/machine-logs.module";
import { MachinesModule } from "./machines/machines.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PublicRequestsModule } from "./public-requests/public-requests.module";
import { ServiceReportsModule } from "./service-reports/service-reports.module";
import { SettingsModule } from "./settings/settings.module";
import { TaskRemindersModule } from "./task-reminders/task-reminders.module";
import { TasksModule } from "./tasks/tasks.module";
import { TicketsModule } from "./tickets/tickets.module";
import { UsersModule } from "./users/users.module";
import { WebhooksModule } from "./webhooks/webhooks.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AcknowledgementsModule,
    AuditModule,
    AttachmentsModule,
    AuthModule,
    PrismaModule,
    CustomersModule,
    DashboardModule,
    MachineLogsModule,
    MachinesModule,
    PublicRequestsModule,
    ServiceReportsModule,
    TaskRemindersModule,
    TasksModule,
    SettingsModule,
    TicketsModule,
    UsersModule,
    WebhooksModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiAuthGuard
    }
  ]
})
export class AppModule {}
