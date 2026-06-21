import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { parseNullablePhoneNumber } from "../common/phone-number";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateSystemSettingsDto } from "./dto/update-system-settings.dto";

const SETTINGS_KEY = "system";

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
  serviceReportAttachmentMaxTotalMb: 100
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
    if (dto.supportEmail !== undefined) next.supportEmail = this.cleanNullableString(dto.supportEmail);
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

  private cleanNullableString(value: string | null | undefined) {
    if (value === null) return null;
    const cleaned = value?.trim();
    return cleaned ? cleaned : null;
  }
}
