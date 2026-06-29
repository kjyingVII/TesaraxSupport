"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AdminMenu } from "../../../components/admin-menu";
import { PhoneNumberInput } from "../../../components/phone-number-input";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiRequest } from "../../../lib/api";

type SystemSettings = {
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
};

type SettingsResponse = {
  data: SystemSettings;
};

const emptyForm = {
  defaultServiceReminderIntervalDays: "90",
  reminderWindowDays: "30",
  companyName: "",
  supportEmail: "",
  supportPhone: "",
  acknowledgementRequiredBeforeClosing: "true",
  requestAttachmentMaxFileMb: "10",
  requestAttachmentMaxTotalMb: "100",
  serviceReportAttachmentMaxFileMb: "10",
  serviceReportAttachmentMaxTotalMb: "100",
  whatsappTicketCreatedEnabled: true,
  whatsappTicketStatusChangedEnabled: true,
  whatsappServiceReportSubmittedEnabled: true,
  whatsappMachineLogCreatedEnabled: true,
  whatsappTaskCreatedEnabled: true,
  whatsappTaskRescheduledEnabled: true
};

export function SettingsPage() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<SettingsResponse>("/api/settings");
      setForm({
        defaultServiceReminderIntervalDays: String(response.data.defaultServiceReminderIntervalDays),
        reminderWindowDays: String(response.data.reminderWindowDays),
        companyName: response.data.companyName ?? "",
        supportEmail: response.data.supportEmail ?? "",
        supportPhone: response.data.supportPhone ?? "",
        acknowledgementRequiredBeforeClosing: response.data.acknowledgementRequiredBeforeClosing ? "true" : "false",
        requestAttachmentMaxFileMb: String(response.data.requestAttachmentMaxFileMb),
        requestAttachmentMaxTotalMb: String(response.data.requestAttachmentMaxTotalMb),
        serviceReportAttachmentMaxFileMb: String(response.data.serviceReportAttachmentMaxFileMb),
        serviceReportAttachmentMaxTotalMb: String(response.data.serviceReportAttachmentMaxTotalMb),
        whatsappTicketCreatedEnabled: response.data.whatsappTicketCreatedEnabled,
        whatsappTicketStatusChangedEnabled: response.data.whatsappTicketStatusChangedEnabled,
        whatsappServiceReportSubmittedEnabled: response.data.whatsappServiceReportSubmittedEnabled,
        whatsappMachineLogCreatedEnabled: response.data.whatsappMachineLogCreatedEnabled,
        whatsappTaskCreatedEnabled: response.data.whatsappTaskCreatedEnabled,
        whatsappTaskRescheduledEnabled: response.data.whatsappTaskRescheduledEnabled
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        defaultServiceReminderIntervalDays: Number(form.defaultServiceReminderIntervalDays),
        reminderWindowDays: Number(form.reminderWindowDays),
        companyName: form.companyName || null,
        supportEmail: form.supportEmail || null,
        supportPhone: form.supportPhone || null,
        acknowledgementRequiredBeforeClosing: form.acknowledgementRequiredBeforeClosing === "true",
        requestAttachmentMaxFileMb: Number(form.requestAttachmentMaxFileMb),
        requestAttachmentMaxTotalMb: Number(form.requestAttachmentMaxTotalMb),
        serviceReportAttachmentMaxFileMb: Number(form.serviceReportAttachmentMaxFileMb),
        serviceReportAttachmentMaxTotalMb: Number(form.serviceReportAttachmentMaxTotalMb),
        whatsappTicketCreatedEnabled: form.whatsappTicketCreatedEnabled,
        whatsappTicketStatusChangedEnabled: form.whatsappTicketStatusChangedEnabled,
        whatsappServiceReportSubmittedEnabled: form.whatsappServiceReportSubmittedEnabled,
        whatsappMachineLogCreatedEnabled: form.whatsappMachineLogCreatedEnabled,
        whatsappTaskCreatedEnabled: form.whatsappTaskCreatedEnabled,
        whatsappTaskRescheduledEnabled: form.whatsappTaskRescheduledEnabled
      };

      const response = await apiRequest<SettingsResponse>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      setForm({
        defaultServiceReminderIntervalDays: String(response.data.defaultServiceReminderIntervalDays),
        reminderWindowDays: String(response.data.reminderWindowDays),
        companyName: response.data.companyName ?? "",
        supportEmail: response.data.supportEmail ?? "",
        supportPhone: response.data.supportPhone ?? "",
        acknowledgementRequiredBeforeClosing: response.data.acknowledgementRequiredBeforeClosing ? "true" : "false",
        requestAttachmentMaxFileMb: String(response.data.requestAttachmentMaxFileMb),
        requestAttachmentMaxTotalMb: String(response.data.requestAttachmentMaxTotalMb),
        serviceReportAttachmentMaxFileMb: String(response.data.serviceReportAttachmentMaxFileMb),
        serviceReportAttachmentMaxTotalMb: String(response.data.serviceReportAttachmentMaxTotalMb),
        whatsappTicketCreatedEnabled: response.data.whatsappTicketCreatedEnabled,
        whatsappTicketStatusChangedEnabled: response.data.whatsappTicketStatusChangedEnabled,
        whatsappServiceReportSubmittedEnabled: response.data.whatsappServiceReportSubmittedEnabled,
        whatsappMachineLogCreatedEnabled: response.data.whatsappMachineLogCreatedEnabled,
        whatsappTaskCreatedEnabled: response.data.whatsappTaskCreatedEnabled,
        whatsappTaskRescheduledEnabled: response.data.whatsappTaskRescheduledEnabled
      });
      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-7xl">
        <header className="field-header">
          <div>
            <nav className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[#5f6368] dark:text-[#a8b0ba]">
              <Link className="field-link" href="/admin">
                Home
              </Link>
              <span>/</span>
              <span>Settings</span>
            </nav>
            <h1 className="field-title">Settings</h1>
          </div>
          <ThemeToggle />
        </header>

        <AdminMenu />

        <section className="field-panel mt-5">
          {loading ? <p className="field-muted">Loading...</p> : null}
          {error ? <div className="field-alert-error">{error}</div> : null}
          {message ? <div className="field-alert-success p-3 text-sm">{message}</div> : null}

          {!loading ? (
            <form className="mt-4 grid gap-5" onSubmit={saveSettings}>
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="Default Machine Maintenance Interval Days" type="number" value={form.defaultServiceReminderIntervalDays} required onChange={(value) => updateField("defaultServiceReminderIntervalDays", value)} />
                <TextInput label="Reminder Window Days" type="number" value={form.reminderWindowDays} required onChange={(value) => updateField("reminderWindowDays", value)} />
                <TextInput label="Company Name" value={form.companyName} onChange={(value) => updateField("companyName", value)} />
                <TextInput label="Support Email" type="email" value={form.supportEmail} onChange={(value) => updateField("supportEmail", value)} />
                <PhoneNumberInput label="Support Phone" value={form.supportPhone} onChange={(value) => updateField("supportPhone", value)} />
                <TextInput label="Request Attachment Max File MB" type="number" value={form.requestAttachmentMaxFileMb} required onChange={(value) => updateField("requestAttachmentMaxFileMb", value)} />
                <TextInput label="Request Attachment Max Total MB" type="number" value={form.requestAttachmentMaxTotalMb} required onChange={(value) => updateField("requestAttachmentMaxTotalMb", value)} />
                <TextInput label="Service Report Attachment Max File MB" type="number" value={form.serviceReportAttachmentMaxFileMb} required onChange={(value) => updateField("serviceReportAttachmentMaxFileMb", value)} />
                <TextInput label="Service Report Attachment Max Total MB" type="number" value={form.serviceReportAttachmentMaxTotalMb} required onChange={(value) => updateField("serviceReportAttachmentMaxTotalMb", value)} />
                <label className="block">
                  <span className="field-label">Acknowledgement Required Before Closing</span>
                  <select className="field-input h-11" value={form.acknowledgementRequiredBeforeClosing} onChange={(event) => updateField("acknowledgementRequiredBeforeClosing", event.target.value)}>
                    <option value="true">Required</option>
                    <option value="false">Not required</option>
                  </select>
                </label>
              </div>

              <section className="grid gap-3 border-t border-[#d9dee5] pt-5 dark:border-[#29313a]">
                <div>
                  <h2 className="field-section-title text-base">WhatsApp Notifications</h2>
                  <p className="field-muted mt-1 text-sm">Choose which workflow events should send automatic WhatsApp messages.</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleInput
                    label="Ticket Created"
                    description="Notify requester and assigned technicians when a new support ticket is lodged."
                    checked={form.whatsappTicketCreatedEnabled}
                    onChange={(checked) => updateField("whatsappTicketCreatedEnabled", checked)}
                  />
                  <ToggleInput
                    label="Ticket Status Changed"
                    description="Notify the requester when a ticket status changes."
                    checked={form.whatsappTicketStatusChangedEnabled}
                    onChange={(checked) => updateField("whatsappTicketStatusChangedEnabled", checked)}
                  />
                  <ToggleInput
                    label="Service Report Submitted"
                    description="Notify the requester when a technician submits a service report."
                    checked={form.whatsappServiceReportSubmittedEnabled}
                    onChange={(checked) => updateField("whatsappServiceReportSubmittedEnabled", checked)}
                  />
                  <ToggleInput
                    label="Machine Log Created"
                    description="Notify the selected contact when a machine log is created with notification enabled."
                    checked={form.whatsappMachineLogCreatedEnabled}
                    onChange={(checked) => updateField("whatsappMachineLogCreatedEnabled", checked)}
                  />
                  <ToggleInput
                    label="Task Created"
                    description="Notify the selected contact when a task is created."
                    checked={form.whatsappTaskCreatedEnabled}
                    onChange={(checked) => updateField("whatsappTaskCreatedEnabled", checked)}
                  />
                  <ToggleInput
                    label="Task Rescheduled"
                    description="Notify the selected contact when a task time is changed."
                    checked={form.whatsappTaskRescheduledEnabled}
                    onChange={(checked) => updateField("whatsappTaskRescheduledEnabled", checked)}
                  />
                </div>
              </section>

              <button className="field-button-primary disabled:opacity-50" type="submit" disabled={saving || hasInvalidNumberSetting(form)}>
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </form>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function TextInput({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input className="field-input h-11" type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ToggleInput({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-md border border-[#d9dee5] bg-white/70 p-4 dark:border-[#29313a] dark:bg-[#121820]">
      <span>
        <span className="block text-sm font-semibold text-[#202124] dark:text-[#f3f6f9]">{label}</span>
        <span className="mt-1 block text-sm text-[#5f6368] dark:text-[#a8b0ba]">{description}</span>
      </span>
      <input className="mt-1 h-5 w-5 accent-[#1f6feb]" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function hasInvalidNumberSetting(form: typeof emptyForm) {
  const positiveFields: Array<keyof typeof emptyForm> = [
    "defaultServiceReminderIntervalDays",
    "reminderWindowDays",
    "requestAttachmentMaxFileMb",
    "requestAttachmentMaxTotalMb",
    "serviceReportAttachmentMaxFileMb",
    "serviceReportAttachmentMaxTotalMb"
  ];

  return (
    positiveFields.some((field) => Number(form[field]) < 1) ||
    Number(form.requestAttachmentMaxFileMb) > Number(form.requestAttachmentMaxTotalMb) ||
    Number(form.serviceReportAttachmentMaxFileMb) > Number(form.serviceReportAttachmentMaxTotalMb)
  );
}
