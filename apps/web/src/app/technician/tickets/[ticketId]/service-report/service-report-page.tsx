"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "../../../../../components/theme-toggle";
import { apiBaseUrl, apiRequest } from "../../../../../lib/api";
import { getAccessToken } from "../../../../../lib/auth";

type Attachment = {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  createdAt: string;
  uploadedByUser: {
    name: string;
    email: string;
  } | null;
};

type TicketDetail = {
  id: string;
  ticketNumber: string;
  status: string;
  issueTitle: string;
  issueDescription: string;
  requesterName: string;
  assignedTechnician: {
    id: string;
    name: string;
    email: string;
  } | null;
  machine: {
    machineName: string;
    model: string;
    serialNumber: string;
    location: string;
    customer: {
      name: string;
    };
  };
  serviceReports: Array<{
    id: string;
    diagnosis: string;
    actionTaken: string;
    partsUsed: string | null;
    recommendations: string | null;
    technicianRemarks: string | null;
    resolutionStatus: string;
    serviceStartAt: string;
    serviceEndAt: string;
    technician?: {
      name: string;
      email: string;
    };
    attachments: Attachment[];
  }>;
};

type TicketDetailResponse = {
  data: TicketDetail;
};

type AttachmentLimitSettings = {
  serviceReportAttachmentMaxFileMb: number;
  serviceReportAttachmentMaxTotalMb: number;
};

type SettingsResponse = {
  data: AttachmentLimitSettings;
};

type ServiceReportSubmitResponse = {
  data: {
    id: string;
    acknowledgementUrl: string;
  };
};

const defaultReportForm = {
  diagnosis: "",
  actionTaken: "",
  partsUsed: "",
  recommendations: "",
  technicianRemarks: "",
  serviceStartAt: "",
  serviceEndAt: "",
  resolutionStatus: "RESOLVED"
};

const bytesPerMb = 1024 * 1024;

export function ServiceReportPage({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [attachmentLimits, setAttachmentLimits] = useState<AttachmentLimitSettings>({
    serviceReportAttachmentMaxFileMb: 10,
    serviceReportAttachmentMaxTotalMb: 100
  });
  const [form, setForm] = useState(defaultReportForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadTicket() {
      setLoading(true);
      setError(null);

      try {
        const [response, settingsResponse] = await Promise.all([
          apiRequest<TicketDetailResponse>(`/api/tickets/${ticketId}`),
          apiRequest<SettingsResponse>("/api/settings")
        ]);
        if (!mounted) return;
        setTicket(response.data);
        setAttachmentLimits(settingsResponse.data);
        setForm(defaultReportForm);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load ticket.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadTicket();

    return () => {
      mounted = false;
    };
  }, [ticketId]);

  async function saveServiceReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticket) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const reportResponse = await apiRequest<ServiceReportSubmitResponse>(`/api/tickets/${ticket.id}/service-report`, {
        method: "POST",
        body: JSON.stringify({
          technicianId: ticket.assignedTechnician?.id,
          diagnosis: form.diagnosis,
          actionTaken: form.actionTaken,
          partsUsed: form.partsUsed,
          recommendations: form.recommendations,
          technicianRemarks: form.technicianRemarks,
          serviceStartAt: new Date(form.serviceStartAt).toISOString(),
          serviceEndAt: new Date(form.serviceEndAt).toISOString(),
          resolutionStatus: form.resolutionStatus
        })
      });

      window.sessionStorage.setItem(
        directLinkStorageKey(reportResponse.data.id),
        reportResponse.data.acknowledgementUrl
      );

      router.push(`/technician/tickets/${ticket.id}/service-report/submitted?reportId=${reportResponse.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save service report.");
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const report = ticket?.serviceReports[0];
    if (!ticket || !report || !attachmentFile) return;

    setUploadingAttachment(true);
    setError(null);
    setMessage(null);

    try {
      const currentTotalBytes = report.attachments.reduce((total, attachment) => total + attachment.fileSizeBytes, 0);

      const maxFileBytes = attachmentLimits.serviceReportAttachmentMaxFileMb * bytesPerMb;
      const maxTotalBytes = attachmentLimits.serviceReportAttachmentMaxTotalMb * bytesPerMb;

      if (attachmentFile.size > maxFileBytes) {
        throw new Error(`Attachment file must be ${attachmentLimits.serviceReportAttachmentMaxFileMb} MB or smaller.`);
      }

      if (currentTotalBytes + attachmentFile.size > maxTotalBytes) {
        throw new Error(`Service report attachments cannot exceed ${attachmentLimits.serviceReportAttachmentMaxTotalMb} MB in total.`);
      }

      const dataBase64 = await readFileAsDataUrl(attachmentFile);
      await apiRequest(`/api/service-reports/${report.id}/attachments`, {
        method: "POST",
        body: JSON.stringify({
          originalFileName: attachmentFile.name,
          contentType: attachmentFile.type || "application/octet-stream",
          dataBase64
        })
      });

      const response = await apiRequest<TicketDetailResponse>(`/api/tickets/${ticket.id}`);
      setTicket(response.data);
      setAttachmentFile(null);
      setMessage("Service report attachment uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload service report attachment.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-4xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">Technician</p>
            <h1 className="field-title">Service Report</h1>
          </div>
          <ThemeToggle />
        </header>

        {loading ? (
          <Panel className="mt-6">
            <p className="field-muted">Loading ticket...</p>
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

        {ticket ? (
          <>
            <Panel className="mt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="field-muted">{ticket.ticketNumber}</p>
                  <h2 className="mt-1 text-xl font-semibold">{ticket.issueTitle}</h2>
                  <p className="field-muted mt-2 leading-6">{ticket.issueDescription}</p>
                </div>
                <span className="status-badge status-blue">
                  {ticket.status}
                </span>
              </div>
            </Panel>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Panel title="Machine">
                <InfoLine label="Customer" value={ticket.machine.customer.name} />
                <InfoLine label="Machine" value={ticket.machine.machineName} />
                <InfoLine label="Serial No." value={ticket.machine.serialNumber} />
                <InfoLine label="Location" value={ticket.machine.location} />
              </Panel>
              <Panel title="Technician">
                <InfoLine label="Assigned" value={ticket.assignedTechnician?.name ?? "Not assigned"} />
                <InfoLine label="Requester" value={ticket.requesterName} />
                <InfoLine label="Reports" value={String(ticket.serviceReports.length)} />
              </Panel>
            </div>

            <Panel title="Submit Service Report" className="mt-5">
              <form className="grid gap-4" onSubmit={saveServiceReport}>
                <TextAreaInput label="Diagnosis" value={form.diagnosis} required onChange={(value) => updateField("diagnosis", value)} />
                <TextAreaInput label="Action Taken" value={form.actionTaken} required onChange={(value) => updateField("actionTaken", value)} />
                <TextInput label="Parts Used" value={form.partsUsed} onChange={(value) => updateField("partsUsed", value)} />
                <TextAreaInput label="Recommendations" value={form.recommendations} onChange={(value) => updateField("recommendations", value)} />
                <TextAreaInput label="Technician Remarks" value={form.technicianRemarks} onChange={(value) => updateField("technicianRemarks", value)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput label="Service Start" type="datetime-local" value={form.serviceStartAt} required onChange={(value) => updateField("serviceStartAt", value)} />
                  <TextInput label="Service End" type="datetime-local" value={form.serviceEndAt} required onChange={(value) => updateField("serviceEndAt", value)} />
                </div>
                <label className="block">
                  <span className="text-sm font-medium">Resolution Status</span>
                  <select
                    className="field-input h-11"
                    value={form.resolutionStatus}
                    onChange={(event) => updateField("resolutionStatus", event.target.value)}
                  >
                    <option value="RESOLVED">Resolved</option>
                    <option value="PARTIALLY_RESOLVED">Partially Resolved</option>
                    <option value="NOT_RESOLVED">Not Resolved</option>
                  </select>
                </label>
                <button
                  className="field-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Service Report"}
                </button>
              </form>
            </Panel>

            <Panel title={`Service Report Attachments (${ticket.serviceReports[0]?.attachments.length ?? 0})`} className="mt-5">
              {ticket.serviceReports[0] ? (
                <>
                  <p className="field-muted mb-3">
                    Maximum {attachmentLimits.serviceReportAttachmentMaxFileMb} MB per file, {attachmentLimits.serviceReportAttachmentMaxTotalMb} MB total per service report.
                  </p>
                  <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={uploadAttachment}>
                    <input
                      className="field-input h-11 py-2 text-sm"
                      type="file"
                      onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
                    />
                    <button
                      className="field-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                      type="submit"
                      disabled={uploadingAttachment || !attachmentFile}
                    >
                      {uploadingAttachment ? "Uploading..." : "Upload"}
                    </button>
                  </form>

                  {ticket.serviceReports[0].attachments.length > 0 ? (
                    <div className="mt-4 grid gap-2">
                      {ticket.serviceReports[0].attachments.map((attachment) => (
                        <a
                          key={attachment.id}
                          className="field-panel-subtle text-sm transition hover:border-[#155e75] dark:hover:border-[#22d3ee]"
                          href={attachmentDownloadUrl(attachment.id)}
                        >
                          <span className="font-medium">{attachment.originalFileName}</span>
                          <span className="mt-1 block text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                            {formatBytes(attachment.fileSizeBytes)} / {attachment.uploadedByUser?.name ?? "Unknown"} / {formatDate(attachment.createdAt)}
                          </span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="field-muted mt-4">No service report attachments uploaded.</p>
                  )}
                </>
              ) : (
                <p className="field-muted">Save the service report before uploading attachments.</p>
              )}
            </Panel>

            <div className="my-5">
              <a className="field-link" href="/technician/tickets">
                Back to Ticket Workbench
              </a>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function buildForm(report: TicketDetail["serviceReports"][number] | undefined) {
  if (report) {
    return {
      diagnosis: report.diagnosis,
      actionTaken: report.actionTaken,
      partsUsed: report.partsUsed ?? "",
      recommendations: report.recommendations ?? "",
      technicianRemarks: report.technicianRemarks ?? "",
      serviceStartAt: toDateTimeLocal(report.serviceStartAt),
      serviceEndAt: toDateTimeLocal(report.serviceEndAt),
      resolutionStatus: report.resolutionStatus
    };
  }

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  return {
    ...defaultReportForm,
    serviceStartAt: toDateTimeLocal(now.toISOString()),
    serviceEndAt: toDateTimeLocal(oneHourLater.toISOString())
  };
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="field-meta-label">{label}</p>
      <p className="mt-1 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{value}</p>
    </div>
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

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
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

function attachmentDownloadUrl(id: string) {
  const token = getAccessToken();
  const params = token ? `?accessToken=${encodeURIComponent(token)}` : "";
  return `${apiBaseUrl}/api/attachments/${id}/download${params}`;
}

function directLinkStorageKey(reportId: string) {
  return `service-report-acknowledgement-link:${reportId}`;
}
