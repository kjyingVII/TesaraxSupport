"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ThemeToggle } from "../../../../../components/theme-toggle";
import { apiRequest } from "../../../../../lib/api";
import { getMachineAccessSession } from "../../../../../lib/machine-access";

type ActivityType =
  | "CORRECTIVE_SERVICE"
  | "MACHINE_MAINTENANCE"
  | "COMPONENT_REPLACEMENT"
  | "INSPECTION_DIAGNOSIS"
  | "UPGRADE"
  | "OTHER";

type PortalResponse = {
  data: {
    machine: {
      machineName: string;
      model: string;
      serialNumber: string;
      location: string;
      customerName: string;
    };
    requestAttachmentMaxFileMb: number;
    requestAttachmentMaxTotalMb: number;
  };
};

type LogForm = {
  activityType: ActivityType;
  workDate: string;
  workEndAt: string;
  workSummary: string;
  partsUsed: string;
  upgradeVersion: string;
  upgradeDescription: string;
  nextServiceDueOverrideAt: string;
  requesterConfirmedName: string;
  requesterContactPhone: string;
  requesterContactEmail: string;
  loggedByRequesterName: string;
};

const defaultForm: LogForm = {
  activityType: "CORRECTIVE_SERVICE",
  workDate: "",
  workEndAt: "",
  workSummary: "",
  partsUsed: "",
  upgradeVersion: "",
  upgradeDescription: "",
  nextServiceDueOverrideAt: "",
  requesterConfirmedName: "",
  requesterContactPhone: "",
  requesterContactEmail: "",
  loggedByRequesterName: ""
};

const bytesPerMb = 1024 * 1024;

export function PublicMachineLogPage({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [machine, setMachine] = useState<PortalResponse["data"]["machine"] | null>(null);
  const [form, setForm] = useState<LogForm>(() => ({
    ...defaultForm,
    workDate: toDateTimeLocal(new Date().toISOString())
  }));
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentLimits, setAttachmentLimits] = useState({
    requestAttachmentMaxFileMb: 10,
    requestAttachmentMaxTotalMb: 100
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const session = getMachineAccessSession(publicId);

    if (!session) {
      router.replace(`/m/${publicId}/access`);
      return;
    }
    const accessSession = session;

    setForm((current) => ({
      ...current,
      requesterConfirmedName: session.requesterName,
      requesterContactPhone: session.requesterPhone,
      requesterContactEmail: session.requesterEmail ?? "",
      loggedByRequesterName: session.requesterName
    }));

    async function loadMachine() {
      try {
        const response = await apiRequest<PortalResponse>(`/api/public/machines/${publicId}/portal`, {
          headers: {
            Authorization: `Bearer ${accessSession.accessToken}`
          }
        });
        if (!mounted) return;
        setMachine(response.data.machine);
        setAttachmentLimits({
          requestAttachmentMaxFileMb: response.data.requestAttachmentMaxFileMb,
          requestAttachmentMaxTotalMb: response.data.requestAttachmentMaxTotalMb
        });
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
  }, [publicId, router]);

  async function createLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getMachineAccessSession(publicId);
    if (!session) {
      router.replace(`/m/${publicId}/access`);
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      validateAttachments(attachments, attachmentLimits.requestAttachmentMaxFileMb, attachmentLimits.requestAttachmentMaxTotalMb);
      const preparedAttachments = await Promise.all(
        attachments.map(async (attachment) => ({
          originalFileName: attachment.name,
          contentType: attachment.type || "application/octet-stream",
          dataBase64: await readFileAsDataUrl(attachment)
        }))
      );

      await apiRequest(`/api/public/machines/${publicId}/logs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
          activityType: form.activityType,
          workDate: new Date(form.workDate).toISOString(),
          workEndAt: form.workEndAt ? new Date(form.workEndAt).toISOString() : undefined,
          workSummary: form.workSummary,
          partsUsed: form.partsUsed,
          upgradeVersion: form.activityType === "UPGRADE" ? form.upgradeVersion : undefined,
          upgradeDescription: form.activityType === "UPGRADE" ? form.upgradeDescription : undefined,
          nextServiceDueOverrideAt: form.activityType === "MACHINE_MAINTENANCE" && form.nextServiceDueOverrideAt
            ? new Date(form.nextServiceDueOverrideAt).toISOString()
            : undefined,
          requesterConfirmedName: form.requesterConfirmedName,
          requesterContactPhone: form.requesterContactPhone,
          requesterContactEmail: form.requesterContactEmail,
          loggedByRequesterName: form.loggedByRequesterName,
          attachments: preparedAttachments
        })
      });

      setMessage("Machine log saved.");
      setForm({
        ...defaultForm,
        activityType: form.activityType,
        workDate: toDateTimeLocal(new Date().toISOString()),
        requesterConfirmedName: session.requesterName,
        requesterContactPhone: session.requesterPhone,
        requesterContactEmail: session.requesterEmail ?? "",
        loggedByRequesterName: session.requesterName
      });
      setAttachments([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save machine log.");
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

  return (
    <main className="field-page">
      <section className="field-shell max-w-3xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">Machine Activity</p>
            <h1 className="field-title">Add Machine Log</h1>
          </div>
          <ThemeToggle />
        </header>

        {loading ? (
          <section className="field-panel mt-6">
            <p className="field-muted">Loading machine...</p>
          </section>
        ) : null}

        {machine ? (
          <section className="field-panel mt-6">
            <p className="field-eyebrow">{machine.customerName}</p>
            <h2 className="mt-1 text-xl font-semibold">{machine.machineName}</h2>
            <p className="field-muted mt-2">{machine.model} / {machine.serialNumber}</p>
            <p className="field-muted mt-1">{machine.location}</p>
          </section>
        ) : null}

        {error ? <div className="field-alert-error mt-5">{error}</div> : null}
        {message ? <div className="field-alert-success mt-5 p-4 text-sm">{message}</div> : null}

        <section className="field-panel mt-5">
          <h2 className="field-section-title">Log Details</h2>
          <form className="mt-4 grid gap-4" onSubmit={createLog}>
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
                Use Machine Maintenance only when the full machine maintenance cycle was completed.
              </p>
            </label>
            <TextInput label="Work Time" type="datetime-local" value={form.workDate} required onChange={(value) => updateForm("workDate", value)} />
            <TextInput label="End Time" type="datetime-local" value={form.workEndAt} onChange={(value) => updateForm("workEndAt", value)} />
            <TextAreaInput label="Issue / Work Summary" value={form.workSummary} required onChange={(value) => updateForm("workSummary", value)} />
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
            <TextInput label="Name" value={form.requesterConfirmedName} required onChange={(value) => updateForm("requesterConfirmedName", value)} />
            <TextInput label="Contact Number" value={form.requesterContactPhone} required onChange={(value) => updateForm("requesterContactPhone", value)} />
            <TextInput label="Email" type="email" value={form.requesterContactEmail} onChange={(value) => updateForm("requesterContactEmail", value)} />
            <TextInput label="Logged By" value={form.loggedByRequesterName} required onChange={(value) => updateForm("loggedByRequesterName", value)} />

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
                onChange={(event) => {
                  setAttachments(Array.from(event.target.files ?? []));
                  setError(null);
                }}
              />
              {attachments.length > 0 ? (
                <div className="grid gap-2">
                  {attachments.map((attachment) => (
                    <div key={`${attachment.name}-${attachment.lastModified}-${attachment.size}`} className="field-panel-subtle text-sm">
                      <span className="font-medium">{attachment.name}</span>
                      <span className="mt-1 block text-xs text-[#5f6368] dark:text-[#a8b0ba]">{formatBytes(attachment.size)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="field-muted">No attachments selected.</p>
              )}
            </div>

            <button className="field-button-primary disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Machine Log"}
            </button>
          </form>
        </section>

        <div className="my-5">
          <Link className="field-link" href={`/m/${publicId}`}>
            Back to Machine Page
          </Link>
        </div>
      </section>
    </main>
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
      <input className="field-input h-11" type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
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
      <textarea className="field-textarea min-h-28" value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function validateAttachments(attachments: File[], maxFileMb: number, maxTotalMb: number) {
  const totalBytes = attachments.reduce((total, attachment) => total + attachment.size, 0);
  const maxFileBytes = maxFileMb * bytesPerMb;
  const maxTotalBytes = maxTotalMb * bytesPerMb;

  for (const attachment of attachments) {
    if (attachment.size === 0) throw new Error("Attachment file cannot be empty.");
    if (attachment.size > maxFileBytes) throw new Error(`Attachment file must be ${maxFileMb} MB or smaller.`);
  }

  if (totalBytes > maxTotalBytes) {
    throw new Error(`Machine log attachments cannot exceed ${maxTotalMb} MB in total.`);
  }
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
