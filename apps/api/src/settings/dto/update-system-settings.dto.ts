export type UpdateSystemSettingsDto = {
  defaultServiceReminderIntervalDays?: number;
  reminderWindowDays?: number;
  companyName?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  acknowledgementRequiredBeforeClosing?: boolean;
  requestAttachmentMaxFileMb?: number;
  requestAttachmentMaxTotalMb?: number;
  serviceReportAttachmentMaxFileMb?: number;
  serviceReportAttachmentMaxTotalMb?: number;
  whatsappTicketCreatedEnabled?: boolean;
  whatsappTicketStatusChangedEnabled?: boolean;
  whatsappServiceReportSubmittedEnabled?: boolean;
  whatsappMachineLogCreatedEnabled?: boolean;
  whatsappScheduledTaskCreatedEnabled?: boolean;
  whatsappScheduledTaskRescheduledEnabled?: boolean;
};
