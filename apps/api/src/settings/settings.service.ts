import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { parseNullableEmail } from "../common/email";
import { parseNullablePhoneNumber } from "../common/phone-number";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateSystemSettingsDto } from "./dto/update-system-settings.dto";

const SETTINGS_KEY = "system";
const weekDays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
type WeekDay = typeof weekDays[number];

export type SystemSettings = {
  defaultServiceReminderIntervalDays: number;
  reminderWindowDays: number;
  companyName: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  acknowledgementRequiredBeforeClosing: boolean;
  requestAttachmentMaxFileMb: number;
  requestAttachmentMaxTotalMb: number;
  serviceReportAttachmentMaxFileMb: number;
  serviceReportAttachmentMaxTotalMb: number;
  whatsappTicketCreatedEnabled: boolean;
  whatsappTicketStatusChangedEnabled: boolean;
  whatsappServiceReportSubmittedEnabled: boolean;
  whatsappMachineLogCreatedEnabled: boolean;
  whatsappTaskCreatedEnabled: boolean;
  whatsappTaskRescheduledEnabled: boolean;
  whatsappTaskDailyReminderEnabled: boolean;
  whatsappTaskDailyReminderTime: string;
  whatsappTaskDailyReminderSkipDays: WeekDay[];
};

const defaultSettings: SystemSettings = {
  defaultServiceReminderIntervalDays: 90,
  reminderWindowDays: 30,
  companyName: null,
  supportEmail: null,
  supportPhone: null,
  acknowledgementRequiredBeforeClosing: true,
  requestAttachmentMaxFileMb: 10,
  requestAttachmentMaxTotalMb: 100,
  serviceReportAttachmentMaxFileMb: 10,
  serviceReportAttachmentMaxTotalMb: 100,
  whatsappTicketCreatedEnabled: true,
  whatsappTicketStatusChangedEnabled: true,
  whatsappServiceReportSubmittedEnabled: true,
  whatsappMachineLogCreatedEnabled: true,
  whatsappTaskCreatedEnabled: true,
  whatsappTaskRescheduledEnabled: true,
  whatsappTaskDailyReminderEnabled: false,
  whatsappTaskDailyReminderTime: "09:00",
  whatsappTaskDailyReminderSkipDays: []
};

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async getSystemSettings() {
    const settings = await this.loadSettings();
    return { data: settings };
  }

  async getCurrentSettings() {
    return this.loadSettings();
  }

  async updateSystemSettings(dto: UpdateSystemSettingsDto, actorUserId?: string) {
    const current = await this.loadSettings();
    const next: SystemSettings = {
      ...current
    };

    if (dto.defaultServiceReminderIntervalDays !== undefined) {
      next.defaultServiceReminderIntervalDays = this.parsePositiveInteger(
        dto.defaultServiceReminderIntervalDays,
        "Default service reminder interval days"
      );
    }

    if (dto.reminderWindowDays !== undefined) {
      next.reminderWindowDays = this.parsePositiveInteger(dto.reminderWindowDays, "Reminder window days");
    }

    if (dto.companyName !== undefined) next.companyName = this.cleanNullableString(dto.companyName);
    if (dto.supportEmail !== undefined) next.supportEmail = parseNullableEmail(dto.supportEmail, "Support email");
    if (dto.supportPhone !== undefined) next.supportPhone = parseNullablePhoneNumber(dto.supportPhone, "Support phone");
    if (dto.acknowledgementRequiredBeforeClosing !== undefined) {
      if (typeof dto.acknowledgementRequiredBeforeClosing !== "boolean") {
        throw new BadRequestException("Acknowledgement required must be true or false.");
      }
      next.acknowledgementRequiredBeforeClosing = dto.acknowledgementRequiredBeforeClosing;
    }
    if (dto.requestAttachmentMaxFileMb !== undefined) {
      next.requestAttachmentMaxFileMb = this.parsePositiveInteger(dto.requestAttachmentMaxFileMb, "Request attachment max file MB");
    }
    if (dto.requestAttachmentMaxTotalMb !== undefined) {
      next.requestAttachmentMaxTotalMb = this.parsePositiveInteger(dto.requestAttachmentMaxTotalMb, "Request attachment max total MB");
    }
    if (dto.serviceReportAttachmentMaxFileMb !== undefined) {
      next.serviceReportAttachmentMaxFileMb = this.parsePositiveInteger(
        dto.serviceReportAttachmentMaxFileMb,
        "Service report attachment max file MB"
      );
    }
    if (dto.serviceReportAttachmentMaxTotalMb !== undefined) {
      next.serviceReportAttachmentMaxTotalMb = this.parsePositiveInteger(
        dto.serviceReportAttachmentMaxTotalMb,
        "Service report attachment max total MB"
      );
    }
    if (dto.whatsappTicketCreatedEnabled !== undefined) {
      next.whatsappTicketCreatedEnabled = this.parseBoolean(dto.whatsappTicketCreatedEnabled, "Ticket created WhatsApp notification");
    }
    if (dto.whatsappTicketStatusChangedEnabled !== undefined) {
      next.whatsappTicketStatusChangedEnabled = this.parseBoolean(dto.whatsappTicketStatusChangedEnabled, "Ticket status changed WhatsApp notification");
    }
    if (dto.whatsappServiceReportSubmittedEnabled !== undefined) {
      next.whatsappServiceReportSubmittedEnabled = this.parseBoolean(dto.whatsappServiceReportSubmittedEnabled, "Service report submitted WhatsApp notification");
    }
    if (dto.whatsappMachineLogCreatedEnabled !== undefined) {
      next.whatsappMachineLogCreatedEnabled = this.parseBoolean(dto.whatsappMachineLogCreatedEnabled, "Machine log created WhatsApp notification");
    }
    if (dto.whatsappTaskCreatedEnabled !== undefined) {
      next.whatsappTaskCreatedEnabled = this.parseBoolean(dto.whatsappTaskCreatedEnabled, "Task created WhatsApp notification");
    }
    if (dto.whatsappTaskRescheduledEnabled !== undefined) {
      next.whatsappTaskRescheduledEnabled = this.parseBoolean(dto.whatsappTaskRescheduledEnabled, "Task rescheduled WhatsApp notification");
    }
    if (dto.whatsappTaskDailyReminderEnabled !== undefined) {
      next.whatsappTaskDailyReminderEnabled = this.parseBoolean(dto.whatsappTaskDailyReminderEnabled, "Task daily reminder WhatsApp notification");
    }
    if (dto.whatsappTaskDailyReminderTime !== undefined) {
      next.whatsappTaskDailyReminderTime = this.parseTime(dto.whatsappTaskDailyReminderTime, "Task daily reminder time");
    }
    if (dto.whatsappTaskDailyReminderSkipDays !== undefined) {
      next.whatsappTaskDailyReminderSkipDays = this.parseWeekDays(dto.whatsappTaskDailyReminderSkipDays, "Task daily reminder skip days");
    }

    if (next.requestAttachmentMaxFileMb > next.requestAttachmentMaxTotalMb) {
      throw new BadRequestException("Request attachment max file MB cannot exceed request attachment max total MB.");
    }

    if (next.serviceReportAttachmentMaxFileMb > next.serviceReportAttachmentMaxTotalMb) {
      throw new BadRequestException("Service report attachment max file MB cannot exceed service report attachment max total MB.");
    }

    const saved = await this.prisma.systemSetting.upsert({
      where: { key: SETTINGS_KEY },
      update: {
        value: next as unknown as Prisma.InputJsonValue
      },
      create: {
        key: SETTINGS_KEY,
        value: next as unknown as Prisma.InputJsonValue
      }
    });

    const updated = this.normalizeSettings(saved.value);
    await this.auditService.write({
      actorUserId,
      action: "UPDATE_SETTINGS",
      entityType: "SystemSetting",
      entityId: SETTINGS_KEY,
      beforeData: current,
      afterData: updated
    });

    return { data: updated };
  }

  private async loadSettings() {
    const record = await this.prisma.systemSetting.findUnique({
      where: { key: SETTINGS_KEY }
    });

    if (!record) {
      return defaultSettings;
    }

    return this.normalizeSettings(record.value);
  }

  private normalizeSettings(value: Prisma.JsonValue): SystemSettings {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return defaultSettings;
    }

    const raw = value as Record<string, unknown>;

    return {
      defaultServiceReminderIntervalDays: this.readPositiveInteger(raw.defaultServiceReminderIntervalDays, defaultSettings.defaultServiceReminderIntervalDays),
      reminderWindowDays: this.readPositiveInteger(raw.reminderWindowDays, defaultSettings.reminderWindowDays),
      companyName: this.readNullableString(raw.companyName),
      supportEmail: this.readNullableString(raw.supportEmail),
      supportPhone: this.readNullableString(raw.supportPhone),
      acknowledgementRequiredBeforeClosing:
        typeof raw.acknowledgementRequiredBeforeClosing === "boolean"
          ? raw.acknowledgementRequiredBeforeClosing
          : defaultSettings.acknowledgementRequiredBeforeClosing,
      requestAttachmentMaxFileMb: this.readPositiveInteger(raw.requestAttachmentMaxFileMb, defaultSettings.requestAttachmentMaxFileMb),
      requestAttachmentMaxTotalMb: this.readPositiveInteger(raw.requestAttachmentMaxTotalMb, defaultSettings.requestAttachmentMaxTotalMb),
      serviceReportAttachmentMaxFileMb: this.readPositiveInteger(
        raw.serviceReportAttachmentMaxFileMb,
        defaultSettings.serviceReportAttachmentMaxFileMb
      ),
      serviceReportAttachmentMaxTotalMb: this.readPositiveInteger(
        raw.serviceReportAttachmentMaxTotalMb,
        defaultSettings.serviceReportAttachmentMaxTotalMb
      ),
      whatsappTicketCreatedEnabled: this.readBoolean(raw.whatsappTicketCreatedEnabled, defaultSettings.whatsappTicketCreatedEnabled),
      whatsappTicketStatusChangedEnabled: this.readBoolean(raw.whatsappTicketStatusChangedEnabled, defaultSettings.whatsappTicketStatusChangedEnabled),
      whatsappServiceReportSubmittedEnabled: this.readBoolean(raw.whatsappServiceReportSubmittedEnabled, defaultSettings.whatsappServiceReportSubmittedEnabled),
      whatsappMachineLogCreatedEnabled: this.readBoolean(raw.whatsappMachineLogCreatedEnabled, defaultSettings.whatsappMachineLogCreatedEnabled),
      whatsappTaskCreatedEnabled: this.readBoolean(
        raw.whatsappTaskCreatedEnabled,
        this.readBoolean(raw.whatsappScheduledTaskCreatedEnabled, defaultSettings.whatsappTaskCreatedEnabled)
      ),
      whatsappTaskRescheduledEnabled: this.readBoolean(
        raw.whatsappTaskRescheduledEnabled,
        this.readBoolean(raw.whatsappScheduledTaskRescheduledEnabled, defaultSettings.whatsappTaskRescheduledEnabled)
      ),
      whatsappTaskDailyReminderEnabled: this.readBoolean(
        raw.whatsappTaskDailyReminderEnabled,
        defaultSettings.whatsappTaskDailyReminderEnabled
      ),
      whatsappTaskDailyReminderTime: this.readTime(raw.whatsappTaskDailyReminderTime, defaultSettings.whatsappTaskDailyReminderTime),
      whatsappTaskDailyReminderSkipDays: this.readWeekDays(
        raw.whatsappTaskDailyReminderSkipDays,
        defaultSettings.whatsappTaskDailyReminderSkipDays
      )
    };
  }

  private parsePositiveInteger(value: number, label: string) {
    if (!Number.isInteger(value) || value < 1) {
      throw new BadRequestException(`${label} must be a positive integer.`);
    }
    return value;
  }

  private readPositiveInteger(value: unknown, fallback: number) {
    return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private readNullableString(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private readBoolean(value: unknown, fallback: boolean) {
    return typeof value === "boolean" ? value : fallback;
  }

  private parseBoolean(value: boolean, label: string) {
    if (typeof value !== "boolean") {
      throw new BadRequestException(`${label} must be true or false.`);
    }
    return value;
  }

  private parseTime(value: string, label: string) {
    if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      throw new BadRequestException(`${label} must use HH:mm format.`);
    }
    return value;
  }

  private parseWeekDays(value: string[], label: string) {
    if (!Array.isArray(value)) {
      throw new BadRequestException(`${label} must be an array.`);
    }

    const uniqueDays = Array.from(new Set(value.map((day) => String(day).trim().toUpperCase())));
    const invalidDay = uniqueDays.find((day) => !weekDays.includes(day as WeekDay));
    if (invalidDay) {
      throw new BadRequestException(`${label} contains an invalid day.`);
    }

    return uniqueDays as WeekDay[];
  }

  private readWeekDays(value: unknown, fallback: WeekDay[]) {
    if (!Array.isArray(value)) return fallback;
    const normalized = value
      .map((day) => String(day).trim().toUpperCase())
      .filter((day): day is WeekDay => weekDays.includes(day as WeekDay));
    return Array.from(new Set(normalized));
  }

  private readTime(value: unknown, fallback: string) {
    return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
  }

  private cleanNullableString(value: string | null | undefined) {
    if (value === null) return null;
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }
}
