import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { NotificationChannel, NotificationStatus, Prisma, TaskStatus, UserRole } from "@prisma/client";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";

const LAST_RUN_KEY = "task-daily-reminder-last-run";
const CHECK_INTERVAL_MS = 60 * 1000;
const OPEN_TASK_STATUSES = [
  TaskStatus.PENDING,
  TaskStatus.SCHEDULED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.WAITING_COMPONENT,
  TaskStatus.WAITING_CUSTOMER
];

type ReminderTask = {
  id: string;
  title: string;
  status: TaskStatus;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  machine: {
    machineName: string;
  };
};

@Injectable()
export class TaskRemindersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskRemindersService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly notificationsService: NotificationsService
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.runIfDue();
    }, CHECK_INTERVAL_MS);
    void this.runIfDue();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async runIfDue() {
    if (this.running) return;
    this.running = true;

    try {
      const settings = await this.settingsService.getCurrentSettings();

      const timeZone = this.getTimeZone();
      const now = new Date();
      const local = this.getLocalParts(now, timeZone);
      const dateKey = local.dateKey;

      if (this.compareTime(local.time, settings.whatsappTaskDailyReminderTime) < 0) return;
      if (await this.hasRunToday(dateKey)) return;

      if (!settings.whatsappTaskDailyReminderEnabled) {
        await this.logDisabledReminderSkip(dateKey, settings.whatsappTaskDailyReminderTime);
        await this.markRun(dateKey);
        this.logger.log(`Daily task reminder skipped for ${dateKey}; reminder is disabled in system settings.`);
        return;
      }

      const sentCount = await this.sendDailyReminders();
      await this.markRun(dateKey);
      this.logger.log(`Daily task reminder completed for ${dateKey}. Staff reminders processed: ${sentCount}.`);
    } catch (error) {
      this.logger.error("Daily task reminder failed.", error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }

  private async sendDailyReminders() {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN] },
        phone: { not: null },
        taskAssignments: {
          some: {
            task: {
              status: { in: OPEN_TASK_STATUSES }
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        taskAssignments: {
          where: {
            task: {
              status: { in: OPEN_TASK_STATUSES }
            }
          },
          select: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                scheduledStartAt: true,
                scheduledEndAt: true,
                machine: {
                  select: {
                    machineName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    for (const user of users) {
      const tasks = user.taskAssignments.map((assignment) => assignment.task).sort((a, b) => this.compareTasks(a, b));
      await this.notificationsService.logTaskDailyReminder({
        userId: user.id,
        recipient: {
          name: user.name,
          phone: user.phone,
          email: user.email
        },
        tasks: tasks.slice(0, 3).map((task) => ({
          title: task.title,
          machineName: task.machine.machineName,
          status: task.status,
          scheduledStartAt: task.scheduledStartAt,
          scheduledEndAt: task.scheduledEndAt
        })),
        additionalTaskCount: Math.max(tasks.length - 3, 0),
        dashboardUrl: this.buildDashboardUrl()
      });
    }

    return users.length;
  }

  private async logDisabledReminderSkip(dateKey: string, reminderTime: string) {
    await this.prisma.notificationLog.create({
      data: {
        relatedType: "TaskDailyReminder",
        relatedId: dateKey,
        channel: NotificationChannel.WHATSAPP,
        subject: `Daily task reminder skipped: ${dateKey}`,
        messageSummary: `Daily task reminder was scheduled for ${reminderTime}, but it is disabled in system settings.`,
        status: NotificationStatus.SKIPPED,
        errorMessage: "Daily task reminder is disabled in system settings."
      }
    });
  }

  private compareTasks(a: ReminderTask, b: ReminderTask) {
    const aDate = a.scheduledStartAt ?? a.scheduledEndAt;
    const bDate = b.scheduledStartAt ?? b.scheduledEndAt;

    if (aDate && bDate) return aDate.getTime() - bDate.getTime();
    if (aDate) return -1;
    if (bDate) return 1;

    const statusOrder: Record<string, number> = {
      [TaskStatus.PENDING]: 1,
      [TaskStatus.IN_PROGRESS]: 2,
      [TaskStatus.WAITING_COMPONENT]: 3,
      [TaskStatus.WAITING_CUSTOMER]: 4,
      [TaskStatus.SCHEDULED]: 5
    };

    return (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99) || a.title.localeCompare(b.title);
  }

  private async hasRunToday(dateKey: string) {
    const record = await this.prisma.systemSetting.findUnique({
      where: { key: LAST_RUN_KEY }
    });
    if (!record || typeof record.value !== "object" || Array.isArray(record.value)) return false;
    const value = record.value as Prisma.JsonObject;
    return value.dateKey === dateKey;
  }

  private async markRun(dateKey: string) {
    await this.prisma.systemSetting.upsert({
      where: { key: LAST_RUN_KEY },
      update: {
        value: {
          dateKey,
          ranAt: new Date().toISOString()
        }
      },
      create: {
        key: LAST_RUN_KEY,
        value: {
          dateKey,
          ranAt: new Date().toISOString()
        }
      }
    });
  }

  private getLocalParts(value: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(value);

    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
    return {
      dateKey: `${get("year")}-${get("month")}-${get("day")}`,
      time: `${get("hour")}:${get("minute")}`
    };
  }

  private compareTime(current: string, target: string) {
    return this.timeToMinutes(current) - this.timeToMinutes(target);
  }

  private timeToMinutes(value: string) {
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  }

  private getTimeZone() {
    return process.env.APP_TIME_ZONE?.trim() || "Asia/Singapore";
  }

  private buildDashboardUrl() {
    const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:3000";
    return `${webAppUrl.replace(/\/$/, "")}/technician/dashboard`;
  }
}
