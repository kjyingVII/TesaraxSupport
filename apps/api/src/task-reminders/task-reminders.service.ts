import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { NotificationChannel, NotificationStatus, Prisma, TaskStatus, TicketPriority, UserRole } from "@prisma/client";
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
const weekDayLabels = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

type ReminderTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TicketPriority;
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

      if (settings.whatsappTaskDailyReminderSkipDays.includes(local.weekday)) {
        await this.logSkipDayReminderSkip(dateKey, settings.whatsappTaskDailyReminderTime, local.weekday);
        await this.markRun(dateKey);
        this.logger.log(`Daily task reminder skipped for ${dateKey}; ${local.weekday} is configured as a skip day.`);
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
    const users = await this.getReminderUsers();

    let sentCount = 0;

    for (const user of users) {
      const result = await this.sendReminderForLoadedUser(user);
      if (result) sentCount += 1;
    }

    return sentCount;
  }

  async listStaffReminderTargets() {
    const users = await this.getReminderUsers({ requirePhone: false, requireOpenTasks: false });

    return {
      data: users.map((user) => {
        const tasks = user.taskAssignments.map((assignment) => assignment.task).sort((a, b) => this.compareTasks(a, b));
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          openTaskCount: tasks.length,
          nextTaskTitle: tasks[0]?.title ?? null,
          nextTaskStartAt: tasks[0]?.scheduledStartAt ?? null
        };
      })
    };
  }

  async sendManualReminder(userId: string) {
    const user = await this.getReminderUser(userId);
    if (!user) {
      throw new NotFoundException("Staff member not found.");
    }

    const result = await this.sendReminderForLoadedUser(user);
    if (!result) {
      throw new BadRequestException("Selected staff has no open assigned tasks.");
    }

    return result;
  }

  private async getReminderUsers(options: { requirePhone?: boolean; requireOpenTasks?: boolean } = {}) {
    const requirePhone = options.requirePhone ?? true;
    const requireOpenTasks = options.requireOpenTasks ?? true;

    return this.prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN] },
        ...(requirePhone ? { phone: { not: null } } : {}),
        ...(requireOpenTasks
          ? {
              taskAssignments: {
                some: {
                  task: {
                    status: { in: OPEN_TASK_STATUSES }
                  }
                }
              }
            }
          : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
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
                priority: true,
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
  }

  private async getReminderUser(userId: string) {
    const users = await this.getReminderUsers({ requirePhone: false, requireOpenTasks: false });
    return users.find((user) => user.id === userId) ?? null;
  }

  private async sendReminderForLoadedUser(user: Awaited<ReturnType<TaskRemindersService["getReminderUsers"]>>[number]) {
    const tasks = user.taskAssignments.map((assignment) => assignment.task).sort((a, b) => this.compareTasks(a, b));
    if (tasks.length === 0) return null;

    return this.notificationsService.logTaskDailyReminder({
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
        priority: task.priority,
        scheduledStartAt: task.scheduledStartAt,
        scheduledEndAt: task.scheduledEndAt
      })),
      additionalTaskCount: Math.max(tasks.length - 3, 0),
      dashboardUrl: this.buildDashboardUrl()
    });
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

  private async logSkipDayReminderSkip(dateKey: string, reminderTime: string, weekday: string) {
    await this.prisma.notificationLog.create({
      data: {
        relatedType: "TaskDailyReminder",
        relatedId: dateKey,
        channel: NotificationChannel.WHATSAPP,
        subject: `Daily task reminder skipped: ${dateKey}`,
        messageSummary: `Daily task reminder was scheduled for ${reminderTime}, but ${this.formatWeekday(weekday)} is configured as a skip day.`,
        status: NotificationStatus.SKIPPED,
        errorMessage: `${this.formatWeekday(weekday)} is configured as a daily task reminder skip day.`
      }
    });
  }

  private compareTasks(a: ReminderTask, b: ReminderTask) {
    const priorityDifference = this.priorityRank(a.priority) - this.priorityRank(b.priority);
    if (priorityDifference !== 0) return priorityDifference;

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

  private priorityRank(priority: TicketPriority | string) {
    const ranks: Record<string, number> = {
      [TicketPriority.URGENT]: 1,
      [TicketPriority.HIGH]: 2,
      [TicketPriority.NORMAL]: 3,
      [TicketPriority.LOW]: 4
    };

    return ranks[priority] ?? 99;
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

    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long"
    }).format(value).toUpperCase();
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
    return {
      dateKey: `${get("year")}-${get("month")}-${get("day")}`,
      time: `${get("hour")}:${get("minute")}`,
      weekday: weekDayLabels.includes(weekday as typeof weekDayLabels[number]) ? weekday as typeof weekDayLabels[number] : "SUNDAY"
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

  private formatWeekday(value: string) {
    return value.toLowerCase().replace(/^\w/, (first) => first.toUpperCase());
  }

  private buildDashboardUrl() {
    const webAppUrl = process.env.WEB_APP_URL ?? "http://localhost:3000";
    return `${webAppUrl.replace(/\/$/, "")}/technician/dashboard`;
  }
}
