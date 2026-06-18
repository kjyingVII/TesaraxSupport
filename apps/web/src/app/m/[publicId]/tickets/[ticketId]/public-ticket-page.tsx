"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { ThemeToggle } from "../../../../../components/theme-toggle";
import { apiBaseUrl, apiRequest } from "../../../../../lib/api";
import { getMachineAccessSession } from "../../../../../lib/machine-access";

type PublicComment = {
  id: string;
  comment: string;
  createdByRequesterName: string | null;
  createdAt: string;
  attachments: AttachmentSummary[];
  createdByUser: {
    name: string;
    email: string;
    role: string;
  } | null;
};

type AcknowledgementSummary = {
  id: string;
  serviceReportId: string | null;
  response: string | null;
  requesterName: string | null;
  requesterPhone: string | null;
  requesterEmail: string | null;
  requesterComment: string | null;
  acknowledgedAt: string | null;
  tokenExpiresAt: string;
  signatureAttachment: {
    id: string;
    originalFileName: string;
    contentType: string;
    fileSizeBytes: number;
    createdAt: string;
  } | null;
};

type ServiceReport = {
  id: string;
  diagnosis: string;
  actionTaken: string;
  partsUsed: string | null;
  recommendations: string | null;
  technicianRemarks: string | null;
  resolutionStatus: string;
  serviceStartAt: string;
  serviceEndAt: string;
  createdAt: string;
  technician: {
    name: string;
    email: string;
  };
  attachments: AttachmentSummary[];
  acknowledgement: AcknowledgementSummary | null;
};

type AttachmentSummary = {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedByRequesterName?: string | null;
  createdAt: string;
};

type StatusHistoryItem = {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  changedByRequesterName: string | null;
  comment: string | null;
  createdAt: string;
  changedByUser: {
    name: string;
    email: string;
    role: string;
  } | null;
};

type AssignedTechnician = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AssignmentSummary = {
  id: string;
  assignedToUserId: string;
  isLead: boolean;
  assignedToUser: AssignedTechnician;
};

type PublicTicketResponse = {
  data: {
    id: string;
    ticketNumber: string;
    requesterName: string;
    requesterCompany: string | null;
    requesterDepartment: string | null;
    requesterPhone: string | null;
    requesterEmail: string | null;
    issueTitle: string;
    issueDescription: string;
    issueCategory: string;
    priority: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    assignedTechnician: AssignedTechnician | null;
    assignments: AssignmentSummary[];
    machine: {
      publicId: string;
      machineName: string;
      model: string;
      serialNumber: string;
      location: string;
      customerName: string;
    };
    comments: PublicComment[];
    statusHistory: StatusHistoryItem[];
    attachments: AttachmentSummary[];
    serviceReports: ServiceReport[];
    acknowledgement: AcknowledgementSummary | null;
    requestAttachmentMaxFileMb: number;
    requestAttachmentMaxTotalMb: number;
  };
};

export function PublicTicketPage({ publicId, ticketId }: { publicId: string; ticketId: string }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<PublicTicketResponse["data"] | null>(null);
  const [comment, setComment] = useState("");
  const [commenterName, setCommenterName] = useState("");
  const [commenterPhone, setCommenterPhone] = useState("");
  const [commenterEmail, setCommenterEmail] = useState("");
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadTicket();
  }, [publicId, ticketId]);

  async function loadTicket() {
    const session = getMachineAccessSession(publicId);
    if (!session) {
      router.replace(`/m/${publicId}/access`);
      return;
    }

    setCommenterName((current) => current || session.requesterName);
    setCommenterPhone((current) => current || session.requesterPhone);
    setCommenterEmail((current) => current || session.requesterEmail || "");
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<PublicTicketResponse>(`/api/public/machines/${publicId}/tickets/${ticketId}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      });
      setTicket(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load ticket.");
    } finally {
      setLoading(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getMachineAccessSession(publicId);
    if (!session || !comment.trim()) return;

    setPosting(true);
    setError(null);
    setMessage(null);

    try {
      const maxFileMb = ticket?.requestAttachmentMaxFileMb ?? 10;
      const maxTotalMb = ticket?.requestAttachmentMaxTotalMb ?? 100;
      validateAttachments(commentAttachments, maxFileMb, maxTotalMb);
      const preparedAttachments = await Promise.all(
        commentAttachments.map(async (attachment) => ({
          originalFileName: attachment.name,
          contentType: attachment.type || "application/octet-stream",
          dataBase64: await readFileAsDataUrl(attachment)
        }))
      );
      await apiRequest(`/api/public/machines/${publicId}/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({
          requesterName: commenterName,
          requesterPhone: commenterPhone || undefined,
          requesterEmail: commenterEmail || undefined,
          comment,
          attachments: preparedAttachments
        })
      });
      setComment("");
      setCommentAttachments([]);
      setMessage("Comment submitted.");
      await loadTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit comment.");
    } finally {
      setPosting(false);
    }
  }

  async function downloadAttachment(attachment: AttachmentSummary) {
    const session = getMachineAccessSession(publicId);
    if (!session) {
      router.replace(`/m/${publicId}/access`);
      return;
    }

    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/public/machines/${publicId}/tickets/${ticketId}/attachments/${attachment.id}/download`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? payload?.error?.message ?? "Unable to download attachment.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = attachment.originalFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download attachment.");
    }
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-4xl">
        <header className="field-header">
          <div>
            <Link className="field-link" href={`/m/${publicId}`}>
              Back to machine page
            </Link>
            <h1 className="field-title">Ticket Status</h1>
          </div>
          <ThemeToggle />
        </header>

        {loading ? (
          <section className="field-panel mt-6">
            <p className="field-muted">Loading ticket...</p>
          </section>
        ) : null}

        {error ? (
          <section className="field-alert-error mt-6">
            {error}
          </section>
        ) : null}

        {ticket ? (
          <>
            <section className="field-panel mt-6">
              <h2 className="field-section-title">Ticket Status</h2>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="field-muted">{ticket.machine.machineName} / {ticket.machine.serialNumber}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{ticket.ticketNumber}</h2>
                  <p className="mt-2 text-sm font-medium">{ticket.issueTitle}</p>
                </div>
                <span className={`status-badge ${statusTone(ticket.status)}`}>
                  {ticket.status.replaceAll("_", " ")}
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <InfoBox label="Priority" value={ticket.priority.replaceAll("_", " ")} />
                <InfoBox label="Category" value={ticket.issueCategory.replaceAll("_", " ")} />
                <InfoBox label="Last Updated" value={formatDateTime(ticket.updatedAt)} />
              </div>
              <div className="field-panel-subtle mt-5 text-sm">
                <p className="field-meta-label">Assigned To</p>
                <p className="mt-2 font-medium">{assignedTechnicianLabel(ticket.assignments, ticket.assignedTechnician)}</p>
              </div>
              <div className="field-panel-subtle mt-5 text-sm">
                <p className="field-meta-label">Current Attention</p>
                <p className="mt-2 font-medium">{attentionLabel(ticket.status)}</p>
              </div>
              <div className="field-panel-subtle mt-5 text-sm">
                <p className="field-meta-label">Issue Description</p>
                <p className="mt-2 whitespace-pre-wrap leading-6 text-neutral-700 dark:text-neutral-200">{ticket.issueDescription}</p>
              </div>

              <details className="group mt-6 border-t border-[#d9dee3] pt-5 dark:border-[#2f3742]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">Status Timeline</h3>
                    <p className="field-muted mt-1">{ticket.statusHistory.length} status update{ticket.statusHistory.length === 1 ? "" : "s"}</p>
                  </div>
                  <span className="text-sm font-medium text-[#155e75] group-open:hidden dark:text-[#67e8f9]">Expand</span>
                  <span className="hidden text-sm font-medium text-[#155e75] group-open:inline dark:text-[#67e8f9]">Collapse</span>
                </summary>
                <div className="mt-4 grid gap-3">
                  {ticket.statusHistory.length === 0 ? <p className="field-muted">No status history yet.</p> : null}
                  {ticket.statusHistory.map((item) => (
                    <article key={item.id} className="field-panel-subtle text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">{item.fromStatus ? `${item.fromStatus.replaceAll("_", " ")} -> ` : ""}{item.toStatus.replaceAll("_", " ")}</span>
                        <span className="text-xs text-[#5f6368] dark:text-[#a8b0ba]">{formatDateTime(item.createdAt)}</span>
                      </div>
                      <p className="field-muted mt-2">
                        {item.changedByUser?.name ?? item.changedByRequesterName ?? "System"}
                      </p>
                      {item.comment ? <p className="mt-2 whitespace-pre-wrap leading-6 text-neutral-700 dark:text-neutral-200">{item.comment}</p> : null}
                    </article>
                  ))}
                </div>
              </details>

              <div className="mt-6 border-t border-[#d9dee3] pt-5 dark:border-[#2f3742]">
                <h3 className="text-base font-semibold">Ticket Attachments</h3>
                <AttachmentList attachments={ticket.attachments} onDownload={downloadAttachment} empty="No ticket attachments." />
              </div>
            </section>

            <section className="field-panel mt-6">
              <h2 className="field-section-title">Service Reports</h2>
              <div className="mt-4 grid gap-3">
                {ticket.serviceReports.length === 0 ? <p className="field-muted">No service report submitted yet.</p> : null}
                {ticket.serviceReports.map((report) => (
                  <article key={report.id} className="field-panel-subtle text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{report.resolutionStatus.replaceAll("_", " ")}</span>
                      <span className="text-xs text-[#5f6368] dark:text-[#a8b0ba]">{formatDateTime(report.createdAt)}</span>
                    </div>
                    <p className="field-muted mt-2">
                      Submitted by technician: {report.technician.name}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap leading-6 text-neutral-700 dark:text-neutral-200">{report.diagnosis}</p>
                    <p className="mt-3 whitespace-pre-wrap leading-6 text-neutral-700 dark:text-neutral-200">{report.actionTaken}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <InfoBox label="Service Start" value={formatDateTime(report.serviceStartAt)} />
                      <InfoBox label="Service End" value={formatDateTime(report.serviceEndAt)} />
                    </div>
                    {report.partsUsed ? <p className="mt-3 whitespace-pre-wrap leading-6 text-neutral-700 dark:text-neutral-200">Parts used: {report.partsUsed}</p> : null}
                    {report.recommendations ? <p className="mt-3 whitespace-pre-wrap leading-6 text-neutral-700 dark:text-neutral-200">{report.recommendations}</p> : null}
                    {report.technicianRemarks ? <p className="mt-3 whitespace-pre-wrap leading-6 text-neutral-700 dark:text-neutral-200">{report.technicianRemarks}</p> : null}
                    <div className="field-panel-subtle mt-4">
                      <p className="field-meta-label">Acknowledgement</p>
                      {report.acknowledgement?.response ? (
                        <div className="mt-2 grid gap-2">
                          <p className="text-sm font-semibold">{report.acknowledgement.response.replaceAll("_", " ")}</p>
                          <p className="field-muted">
                            Signed by {report.acknowledgement.requesterName ?? "Requester"}
                            {report.acknowledgement.acknowledgedAt ? ` on ${formatDateTime(report.acknowledgement.acknowledgedAt)}` : ""}
                          </p>
                          <details className="group mt-3 rounded-md border border-[#d9dee3] bg-white p-3 dark:border-[#2f3742] dark:bg-[#0f1115]">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                              <span className="text-sm font-medium">More Info</span>
                              <span className="text-sm font-medium text-[#155e75] group-open:hidden dark:text-[#67e8f9]">Expand</span>
                              <span className="hidden text-sm font-medium text-[#155e75] group-open:inline dark:text-[#67e8f9]">Collapse</span>
                            </summary>
                            <div className="mt-3 grid gap-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <InfoBox label="Contact Number" value={report.acknowledgement.requesterPhone ?? "Not recorded"} />
                                <InfoBox label="Email" value={report.acknowledgement.requesterEmail ?? "Not recorded"} />
                              </div>
                              {report.acknowledgement.requesterComment ? (
                                <p className="whitespace-pre-wrap leading-6 text-neutral-700 dark:text-neutral-200">{report.acknowledgement.requesterComment}</p>
                              ) : null}
                              <SignaturePreview
                                publicId={publicId}
                                ticketId={ticketId}
                                attachmentId={report.acknowledgement.signatureAttachment?.id ?? null}
                              />
                            </div>
                          </details>
                        </div>
                      ) : report.acknowledgement ? (
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="field-muted">Requester signature is pending for this service visit.</p>
                          <Link
                            className="field-button-primary inline-grid min-h-10 place-items-center"
                            href={`/m/${publicId}/tickets/${ticketId}/service-reports/${report.id}/acknowledgement`}
                          >
                            Acknowledge This Visit
                          </Link>
                        </div>
                      ) : (
                        <p className="field-muted mt-2">No acknowledgement requested for this service visit.</p>
                      )}
                    </div>
                    <div className="mt-4">
                      <p className="field-meta-label">Attachments</p>
                      <AttachmentList attachments={report.attachments} onDownload={downloadAttachment} empty="No service report attachments." />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="field-panel mt-6">
              <h2 className="field-section-title">Conversation</h2>
              {message ? <p className="field-alert-success mt-3 p-3 text-sm">{message}</p> : null}
              <div className="mt-4 grid gap-3">
                {ticket.comments.length === 0 ? <p className="field-muted">No comments yet.</p> : null}
                {ticket.comments.map((item) => (
                  <article key={item.id} className="field-panel-subtle text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{item.createdByUser?.name ?? item.createdByRequesterName ?? "Requester"}</span>
                      <span className="text-xs text-[#5f6368] dark:text-[#a8b0ba]">{formatDateTime(item.createdAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap leading-6 text-neutral-700 dark:text-neutral-200">{item.comment}</p>
                    <AttachmentList attachments={item.attachments} onDownload={downloadAttachment} empty="No comment attachments." compact />
                  </article>
                ))}
              </div>

              <form className="mt-5 grid gap-3 border-t border-[#d9dee3] pt-4 dark:border-[#2f3742]" onSubmit={submitComment}>
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextInput label="Name" value={commenterName} required onChange={setCommenterName} />
                  <TextInput label="Phone" value={commenterPhone} onChange={setCommenterPhone} />
                  <TextInput label="Email" type="email" value={commenterEmail} onChange={setCommenterEmail} />
                </div>
                <label className="block">
                  <span className="field-label">Comment</span>
                  <textarea
                    className="field-textarea"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />
                </label>
                <div className="grid gap-2">
                  <p className="field-muted">
                    Attachments: max {ticket.requestAttachmentMaxFileMb} MB per file, {ticket.requestAttachmentMaxTotalMb} MB total.
                  </p>
                  <input
                    className="field-input py-2 text-sm"
                    type="file"
                    multiple
                    onChange={(event) => setCommentAttachments(Array.from(event.target.files ?? []))}
                  />
                  {commentAttachments.length > 0 ? (
                    <p className="text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                      Selected: {commentAttachments.map((file) => file.name).join(", ")}
                    </p>
                  ) : null}
                </div>
                <button className="field-button-primary" type="submit" disabled={posting || !commenterName.trim() || !comment.trim()}>
                  {posting ? "Submitting..." : "Submit Comment"}
                </button>
              </form>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

function AttachmentList({
  attachments,
  onDownload,
  empty,
  compact = false
}: {
  attachments: AttachmentSummary[];
  onDownload: (attachment: AttachmentSummary) => void;
  empty: string;
  compact?: boolean;
}) {
  if (attachments.length === 0) {
    return compact ? null : <p className="field-muted mt-3">{empty}</p>;
  }

  return (
    <div className="mt-3 grid gap-2">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="field-panel-subtle flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{attachment.originalFileName}</p>
            <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">
              {formatBytes(attachment.fileSizeBytes)} / {attachment.contentType} / {formatDateTime(attachment.createdAt)}
            </p>
          </div>
          <button
            className="field-button-secondary"
            type="button"
            onClick={() => onDownload(attachment)}
          >
            Download
          </button>
        </div>
      ))}
    </div>
  );
}

function SignaturePreview({
  publicId,
  ticketId,
  attachmentId
}: {
  publicId: string;
  ticketId: string;
  attachmentId: string | null;
}) {
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attachmentId) {
      setSignatureDataUrl(null);
      setError(null);
      return;
    }

    const session = getMachineAccessSession(publicId);
    if (!session) return;
    const accessToken = session.accessToken;
    const currentAttachmentId = attachmentId;

    let cancelled = false;
    async function loadSignature() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/public/machines/${publicId}/tickets/${ticketId}/attachments/${currentAttachmentId}/download`, {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error("Signature is not available.");
        }

        const text = await response.text();
        if (!cancelled) {
          setSignatureDataUrl(text);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSignatureDataUrl(null);
          setError(err instanceof Error ? err.message : "Signature is not available.");
        }
      }
    }

    void loadSignature();

    return () => {
      cancelled = true;
    };
  }, [attachmentId, publicId, ticketId]);

  if (!attachmentId) {
    return <p className="field-muted">Signature file is not attached.</p>;
  }

  return (
    <div className="mt-2">
      <p className="field-meta-label">Acknowledged By</p>
      {signatureDataUrl ? (
        <div className="mt-2 rounded-md border border-[#d9dee3] bg-white p-3 dark:border-[#2f3742]">
          <img className="max-h-40 w-full object-contain" src={signatureDataUrl} alt="Requester signature" />
        </div>
      ) : (
        <p className="field-muted mt-2">{error ?? "Loading signature..."}</p>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-panel-subtle">
      <p className="field-meta-label">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
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

function formatDateTime(value: string) {
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

function attentionLabel(status: string) {
  switch (status) {
    case "WAITING_FOR_REQUESTER":
    case "PENDING_ACKNOWLEDGEMENT":
    case "FOLLOW_UP_REQUIRED":
      return "Waiting for requester response.";
    case "RESOLVED":
    case "CLOSED":
      return "Service team has completed the ticket.";
    case "NEW":
    case "ASSIGNED":
    case "IN_PROGRESS":
    case "WAITING_FOR_PARTS":
      return "Service team is handling this ticket.";
    default:
      return "Ticket is being reviewed.";
  }
}

function assignedTechnicianLabel(assignments: AssignmentSummary[], assignedTechnician: AssignedTechnician | null) {
  if (assignments.length > 0) {
    return assignments
      .map((assignment) => `${assignment.assignedToUser.name}${assignment.isLead ? " (Lead)" : ""}`)
      .join(", ");
  }

  return assignedTechnician?.name ?? "Not assigned yet.";
}

function statusTone(status: string) {
  switch (status) {
    case "ASSIGNED":
      return "status-blue";
    case "IN_PROGRESS":
      return "status-cyan";
    case "WAITING_FOR_REQUESTER":
      return "status-amber";
    case "WAITING_FOR_PARTS":
      return "status-orange";
    case "PENDING_ACKNOWLEDGEMENT":
      return "status-emerald";
    case "FOLLOW_UP_REQUIRED":
      return "status-violet";
    case "RESOLVED":
      return "status-green";
    case "CLOSED":
      return "status-neutral";
    default:
      return "status-neutral";
  }
}

function validateAttachments(attachments: File[], maxFileMb: number, maxTotalMb: number) {
  const totalBytes = attachments.reduce((total, attachment) => total + attachment.size, 0);
  const maxFileBytes = maxFileMb * 1024 * 1024;
  const maxTotalBytes = maxTotalMb * 1024 * 1024;

  for (const attachment of attachments) {
    if (attachment.size === 0) {
      throw new Error("Attachment file cannot be empty.");
    }

    if (attachment.size > maxFileBytes) {
      throw new Error(`Attachment file must be ${maxFileMb} MB or smaller.`);
    }
  }

  if (totalBytes > maxTotalBytes) {
    throw new Error(`Comment attachments cannot exceed ${maxTotalMb} MB in total.`);
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}
