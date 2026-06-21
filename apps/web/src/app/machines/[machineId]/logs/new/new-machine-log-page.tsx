"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminMenu } from "../../../../../components/admin-menu";
import { ThemeToggle } from "../../../../../components/theme-toggle";
import { apiRequest } from "../../../../../lib/api";
import { getAuthUser, type AuthUser } from "../../../../../lib/auth";

type MachineDetail = {
  id: string;
  machineName: string;
  model: string;
  serialNumber: string;
  location: string;
  customer: {
    name: string;
  };
};

type MachineResponse = {
  data: MachineDetail;
};

type AttachmentLimitSettings = {
  requestAttachmentMaxFileMb: number;
  requestAttachmentMaxTotalMb: number;
};

type SettingsResponse = {
  data: AttachmentLimitSettings;
};

type ActivityType =
  | "CORRECTIVE_SERVICE"
  | "MACHINE_MAINTENANCE"
  | "COMPONENT_REPLACEMENT"
  | "INSPECTION_DIAGNOSIS"
  | "UPGRADE"
  | "OTHER";

type LogForm = {
  activityType: ActivityType;
  workDate: string;
  workEndAt: string;
  title: string;
  workSummary: string;
  partsUsed: string;
  upgradeVersion: string;
  upgradeDescription: string;
  nextServiceDueOverrideAt: string;
  requesterAcknowledgementRequired: boolean;
  loggedByRequesterName: string;
  loggedByContactCountryCode: string;
  loggedByContactPhone: string;
  loggedByContactEmail: string;
  notifyCustomer: boolean;
  notifyRecipientName: string;
  notifyRecipientCountryCode: string;
  notifyRecipientPhone: string;
  notifyRecipientEmail: string;
  notifyMessage: string;
};

const defaultLogForm: LogForm = {
  activityType: "CORRECTIVE_SERVICE",
  workDate: "",
  workEndAt: "",
  title: "",
  workSummary: "",
  partsUsed: "",
  upgradeVersion: "",
  upgradeDescription: "",
  nextServiceDueOverrideAt: "",
  requesterAcknowledgementRequired: false,
  loggedByRequesterName: "",
  loggedByContactCountryCode: "+65",
  loggedByContactPhone: "",
  loggedByContactEmail: "",
  notifyCustomer: false,
  notifyRecipientName: "",
  notifyRecipientCountryCode: "+65",
  notifyRecipientPhone: "",
  notifyRecipientEmail: "",
  notifyMessage: ""
};

const bytesPerMb = 1024 * 1024;
const countryCodes = [
  { label: "SG", value: "+65", minLength: 8, maxLength: 8, pattern: /^[3689]\d{7}$/ },
  { label: "MY", value: "+60", minLength: 8, maxLength: 10 },
  { label: "ID", value: "+62", minLength: 8, maxLength: 12 },
  { label: "TH", value: "+66", minLength: 8, maxLength: 9 },
  { label: "PH", value: "+63", minLength: 10, maxLength: 10 },
  { label: "VN", value: "+84", minLength: 9, maxLength: 10 },
  { label: "CN", value: "+86", minLength: 11, maxLength: 11 },
  { label: "IN", value: "+91", minLength: 10, maxLength: 10 },
  { label: "US", value: "+1", minLength: 10, maxLength: 10 }
];

export function NewMachineLogPage({ machineId }: { machineId: string }) {
  const [machine, setMachine] = useState<MachineDetail | null>(null);
  const [user] = useState<AuthUser | null>(() => getAuthUser());
  const [form, setForm] = useState<LogForm>(() => ({
    ...defaultLogForm,
    workDate: toDateTimeLocal(new Date().toISOString()),
    loggedByRequesterName: getAuthUser()?.name ?? ""
  }));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentLimits, setAttachmentLimits] = useState<AttachmentLimitSettings>({
    requestAttachmentMaxFileMb: 10,
    requestAttachmentMaxTotalMb: 100
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadMachine() {
      try {
        const [response, settingsResponse] = await Promise.all([
          apiRequest<MachineResponse>(`/api/machines/${machineId}`),
          apiRequest<SettingsResponse>("/api/settings")
        ]);
        if (!mounted) return;
        setMachine(response.data);
        setAttachmentLimits(settingsResponse.data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load machine.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadMachine();

    return () => {
      mounted = false;
    };
  }, [machineId]);

  async function createLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const loggedByPhone = formatPhoneNumber(form.loggedByContactCountryCode, form.loggedByContactPhone, "Logged by contact number");
      const notifyPhone = form.notifyCustomer
        ? formatPhoneNumber(form.notifyRecipientCountryCode, form.notifyRecipientPhone, "Notify phone")
        : undefined;
      validateAttachments(attachments, attachmentLimits.requestAttachmentMaxFileMb, attachmentLimits.requestAttachmentMaxTotalMb);
      const preparedAttachments = await Promise.all(
        attachments.map(async (attachment) => ({
          originalFileName: attachment.name,
          contentType: attachment.type || "application/octet-stream",
          dataBase64: await readFileAsDataUrl(attachment)
        }))
      );

      await apiRequest(`/api/machines/${machineId}/logs`, {
        method: "POST",
        body: JSON.stringify({
          activityType: form.activityType,
          workDate: new Date(form.workDate).toISOString(),
          workEndAt: form.workEndAt ? new Date(form.workEndAt).toISOString() : undefined,
          title: form.title,
          workSummary: form.workSummary,
          partsUsed: form.partsUsed,
          upgradeVersion: form.activityType === "UPGRADE" ? form.upgradeVersion : undefined,
          upgradeDescription: form.activityType === "UPGRADE" ? form.upgradeDescription : undefined,
          nextServiceDueOverrideAt: form.activityType === "MACHINE_MAINTENANCE" && form.nextServiceDueOverrideAt
            ? new Date(form.nextServiceDueOverrideAt).toISOString()
            : undefined,
          requesterContactPhone: loggedByPhone,
          requesterContactEmail: form.loggedByContactEmail,
          requesterAcknowledgementRequired: form.requesterAcknowledgementRequired,
          notifyCustomer: form.notifyCustomer,
          notifyRecipientName: form.notifyCustomer ? form.notifyRecipientName : undefined,
          notifyRecipientPhone: notifyPhone,
          notifyRecipientEmail: form.notifyCustomer ? form.notifyRecipientEmail : undefined,
          notifyMessage: form.notifyCustomer ? form.notifyMessage : undefined,
          loggedByUserId: user?.id,
          loggedByRequesterName: form.loggedByRequesterName,
          attachments: preparedAttachments
        })
      });
      setMessage(`${activityTypeLabel(form.activityType)} log created.`);
      setForm({
        ...defaultLogForm,
        activityType: form.activityType,
        workDate: toDateTimeLocal(new Date().toISOString()),
        loggedByRequesterName: user?.name ?? "",
        loggedByContactCountryCode: form.loggedByContactCountryCode,
        notifyRecipientCountryCode: form.notifyRecipientCountryCode
      });
      setAttachments([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create machine log.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateForm<K extends keyof LogForm>(field: K, value: LogForm[K]) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateAttachments(files: FileList | null) {
    setAttachments(Array.from(files ?? []));
    setError(null);
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-3xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">Machine History</p>
            <h1 className="field-title">Add Machine Log</h1>
          </div>
          <ThemeToggle />
        </header>

        <AdminMenu />

        {loading ? (
          <Panel className="mt-6">
            <p className="field-muted">Loading machine...</p>
          </Panel>
        ) : null}

        {machine ? (
          <Panel className="mt-6">
            <p className="field-muted">{machine.customer.name}</p>
            <h2 className="mt-1 text-xl font-semibold">{machine.machineName}</h2>
            <p className="field-muted mt-2">
              {machine.model} / {machine.serialNumber}
            </p>
            <p className="field-muted mt-1">{machine.location}</p>
          </Panel>
        ) : null}

        {error ? (
          <div className="field-alert-error mt-5">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="field-alert-success mt-5 p-4 text-sm">
            {message}
          </div>
        ) : null}

        <Panel title="Log Details" className="mt-5">
          <form className="grid gap-4" onSubmit={createLog}>
            <label className="block">
              <span className="field-label">Type</span>
              <select
                className="field-input h-11"
                value={form.activityType}
                onChange={(event) => updateForm("activityType", event.target.value as ActivityType)}
              >
                <option value="CORRECTIVE_SERVICE">Corrective Service</option>
                <option value="MACHINE_MAINTENANCE">Machine Maintenance</option>
                <option value="COMPONENT_REPLACEMENT">Component Replacement</option>
                <option value="INSPECTION_DIAGNOSIS">Inspection / Diagnosis</option>
                <option value="UPGRADE">Upgrade</option>
                <option value="OTHER">Other</option>
              </select>
              <p className="field-muted mt-2">
                Only Machine Maintenance updates the machine maintenance schedule. Other log types are saved as activity history only.
              </p>
            </label>
            <TextInput label="Work Time" type="datetime-local" value={form.workDate} required onChange={(value) => updateForm("workDate", value)} />
            <TextInput label="End Time" type="datetime-local" value={form.workEndAt} onChange={(value) => updateForm("workEndAt", value)} />
            <TextInput label="Title" value={form.title} required onChange={(value) => updateForm("title", value)} />
            <TextAreaInput label="Work Summary" value={form.workSummary} required onChange={(value) => updateForm("workSummary", value)} />
            <TextInput label="Parts Used" value={form.partsUsed} onChange={(value) => updateForm("partsUsed", value)} />
            {form.activityType === "UPGRADE" ? (
              <>
                <TextInput label="Upgrade Version" value={form.upgradeVersion} onChange={(value) => updateForm("upgradeVersion", value)} />
                <TextAreaInput label="Upgrade Description" value={form.upgradeDescription} onChange={(value) => updateForm("upgradeDescription", value)} />
              </>
            ) : null}
            {form.activityType === "MACHINE_MAINTENANCE" ? (
              <TextInput
                label="Next Machine Maintenance Override"
                type="datetime-local"
                value={form.nextServiceDueOverrideAt}
                onChange={(value) => updateForm("nextServiceDueOverrideAt", value)}
              />
            ) : null}
            <div className="field-panel-subtle grid gap-3">
              <p className="text-sm font-semibold">Logged By</p>
              <TextInput label="Name" value={form.loggedByRequesterName} onChange={(value) => updateForm("loggedByRequesterName", value)} />
              <PhoneInput
                label="Contact Number"
                countryCode={form.loggedByContactCountryCode}
                phone={form.loggedByContactPhone}
                onCountryCodeChange={(value) => updateForm("loggedByContactCountryCode", value)}
                onPhoneChange={(value) => updateForm("loggedByContactPhone", value)}
              />
              <TextInput label="Email" type="email" value={form.loggedByContactEmail} onChange={(value) => updateForm("loggedByContactEmail", value)} />
            </div>

            <div className="field-panel-subtle grid gap-3">
              <CheckboxInput
                label="Notify customer"
                description="Create a WhatsApp notification log for a customer contact after this machine log is saved."
                checked={form.notifyCustomer}
                onChange={(value) => updateForm("notifyCustomer", value)}
              />
              {form.notifyCustomer ? (
                <div className="grid gap-3">
                  <TextInput label="Notify Name" value={form.notifyRecipientName} onChange={(value) => updateForm("notifyRecipientName", value)} />
                  <PhoneInput
                    label="Notify Phone"
                    countryCode={form.notifyRecipientCountryCode}
                    phone={form.notifyRecipientPhone}
                    required
                    onCountryCodeChange={(value) => updateForm("notifyRecipientCountryCode", value)}
                    onPhoneChange={(value) => updateForm("notifyRecipientPhone", value)}
                  />
                  <TextInput label="Notify Email" type="email" value={form.notifyRecipientEmail} onChange={(value) => updateForm("notifyRecipientEmail", value)} />
                  <TextAreaInput label="Message Note" value={form.notifyMessage} onChange={(value) => updateForm("notifyMessage", value)} />
                </div>
              ) : null}
            </div>

            <CheckboxInput
              label="User signature required"
              description="Mark this if the user must sign this machine log later."
              checked={form.requesterAcknowledgementRequired}
              onChange={(value) => updateForm("requesterAcknowledgementRequired", value)}
            />
            <div className="field-panel-subtle grid gap-3">
              <div>
                <p className="text-sm font-medium">Attachments</p>
                <p className="field-muted mt-1">
                  Maximum {attachmentLimits.requestAttachmentMaxFileMb} MB per file, {attachmentLimits.requestAttachmentMaxTotalMb} MB total per log.
                </p>
              </div>
              <input
                className="field-input h-11 py-2 text-sm"
                type="file"
                multiple
                onChange={(event) => updateAttachments(event.target.files)}
              />
              {attachments.length > 0 ? (
                <div className="grid gap-2">
                  {attachments.map((attachment) => (
                    <div key={`${attachment.name}-${attachment.lastModified}-${attachment.size}`} className="field-panel-subtle text-sm">
                      <span className="font-medium">{attachment.name}</span>
                      <span className="mt-1 block text-xs text-[#5f6368] dark:text-[#a8b0ba]">{formatBytes(attachment.size)}</span>
                    </div>
                  ))}
                  <p className="text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                    Total selected: {formatBytes(attachments.reduce((total, attachment) => total + attachment.size, 0))}
                  </p>
                </div>
              ) : (
                <p className="field-muted">No attachments selected.</p>
              )}
            </div>
            <button
              className="field-button-primary disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save Log"}
            </button>
          </form>
        </Panel>

        <div className="my-5">
          <a className="field-link" href={`/machines/${machineId}/logs`}>
            Back to Full Machine Log
          </a>
        </div>
      </section>
    </main>
  );
}

function Panel({
  title,
  className = "",
  children
}: {
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`field-panel ${className}`}>
      {title ? <h2 className="field-section-title">{title}</h2> : null}
      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  required,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        className="field-input h-11"
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function PhoneInput({
  label,
  countryCode,
  phone,
  onCountryCodeChange,
  onPhoneChange,
  required
}: {
  label: string;
  countryCode: string;
  phone: string;
  onCountryCodeChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
        <select
          className="field-input h-11"
          value={countryCode}
          onChange={(event) => onCountryCodeChange(event.target.value)}
        >
          {countryCodes.map((country) => (
            <option key={country.value} value={country.value}>
              {country.label} {country.value}
            </option>
          ))}
        </select>
        <input
          className="field-input h-11"
          inputMode="tel"
          placeholder={countryCode === "+65" ? "91234567" : "Phone number"}
          required={required}
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
        />
      </div>
      <p className="field-muted mt-1 text-xs">Saved in international format, for example +6591234567.</p>
    </div>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
  required
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <textarea
        className="field-textarea min-h-24"
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function CheckboxInput({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-[#d9dee3] bg-[#fbfcfd] p-3 text-sm dark:border-[#2f3742] dark:bg-[#1f242d]">
      <input
        className="mt-1 h-4 w-4"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="font-medium">{label}</span>
        {description ? <span className="field-muted mt-1 block">{description}</span> : null}
      </span>
    </label>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function activityTypeLabel(value: ActivityType) {
  switch (value) {
    case "MACHINE_MAINTENANCE":
      return "Machine Maintenance";
    case "COMPONENT_REPLACEMENT":
      return "Component Replacement";
    case "INSPECTION_DIAGNOSIS":
      return "Inspection / Diagnosis";
    case "OTHER":
      return "Other";
    case "UPGRADE":
      return "Upgrade";
    case "CORRECTIVE_SERVICE":
    default:
      return "Corrective Service";
  }
}

function validateAttachments(attachments: File[], maxFileMb: number, maxTotalMb: number) {
  const totalBytes = attachments.reduce((total, attachment) => total + attachment.size, 0);
  const maxFileBytes = maxFileMb * bytesPerMb;
  const maxTotalBytes = maxTotalMb * bytesPerMb;

  for (const attachment of attachments) {
    if (attachment.size === 0) {
      throw new Error("Attachment file cannot be empty.");
    }

    if (attachment.size > maxFileBytes) {
      throw new Error(`Attachment file must be ${maxFileMb} MB or smaller.`);
    }
  }

  if (totalBytes > maxTotalBytes) {
    throw new Error(`Machine log attachments cannot exceed ${maxTotalMb} MB in total.`);
  }
}

function formatPhoneNumber(countryCode: string, localNumber: string, fieldName: string) {
  const rawNumber = localNumber.trim();
  if (!rawNumber) return undefined;

  const country = countryCodes.find((item) => item.value === countryCode) ?? countryCodes[0];
  const digits = rawNumber.replace(/\D/g, "").replace(/^0+/, "");

  if (
    digits.length < country.minLength ||
    digits.length > country.maxLength ||
    (country.pattern && !country.pattern.test(digits))
  ) {
    throw new Error(`${fieldName} is not valid for ${country.label}.`);
  }

  return `${country.value}${digits}`;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}
