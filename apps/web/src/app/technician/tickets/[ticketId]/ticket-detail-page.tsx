"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AdminMenu } from "../../../../components/admin-menu";
import { ThemeToggle } from "../../../../components/theme-toggle";
import { apiBaseUrl, apiRequest } from "../../../../lib/api";
import { getAccessToken, getAuthUser, type AuthUser } from "../../../../lib/auth";

type TicketDetail = {
  id: string;
  ticketNumber: string;
  requesterName: string;
  requesterPhone: string | null;
  requesterEmail: string | null;
  issueTitle: string;
  issueDescription: string;
  issueCategory: string;
  priority: string;
  status: string;
  createdAt: string;
  machine: {
    id: string;
    publicId: string;
    machineName: string;
    model: string;
    serialNumber: string;
    location: string;
    customer: {
      name: string;
    };
  };
  assignments: Array<{
    id: string;
    isLead: boolean;
    assignedToUser: {
      name: string;
      email: string;
    };
  }>;
  attachments: Attachment[];
  comments: Array<{
    id: string;
    comment: string;
    visibility: string;
    createdByRequesterName: string | null;
    createdAt: string;
    createdByUser: {
      name: string;
      email: string;
    } | null;
    attachments: Attachment[];
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changedByRequesterName: string | null;
    comment: string | null;
    createdAt: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    taskType: string;
    description: string | null;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    status: string;
    assignments: Array<{
      technician: {
        name: string;
        email: string;
      };
    }>;
  }>;
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
    acknowledgement: {
      response: string | null;
      requesterName: string | null;
      requesterPhone: string | null;
      requesterEmail: string | null;
      requesterComment: string | null;
      acknowledgedAt: string | null;
    } | null;
  }>;
};

type Attachment = {
  id: string;
  originalFileName: string;
  fileSizeBytes: number;
  createdAt: string;
  uploadedByUser?: {
    name: string;
    email: string;
  } | null;
  uploadedByRequesterName?: string | null;
};

type TicketDetailResponse = {
  data: TicketDetail;
};

export function TicketDetailPage({ ticketId }: { ticketId: string }) {
  const [user] = useState<AuthUser | null>(() => getAuthUser());
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canAdminCloseTicket = user?.role === "ADMIN";

  async function loadTicket() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<TicketDetailResponse>(`/api/tickets/${ticketId}`);
      setTicket(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load ticket detail.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadMountedTicket() {
      setLoading(true);
      setError(null);

      try {
        const response = await apiRequest<TicketDetailResponse>(`/api/tickets/${ticketId}`);
        if (!mounted) return;
        setTicket(response.data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load ticket detail.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadMountedTicket();

    return () => {
      mounted = false;
    };
  }, [ticketId]);

  async function updateTicketStatus(nextStatus: "CLOSED" | "CANCELLED") {
    if (!ticket || !user?.id) return;
    setActionBusy(true);
    setMessage(null);
    setError(null);

    try {
      await apiRequest(`/api/tickets/${ticket.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus,
          changedByUserId: user.id,
          comment: `Admin updated status to ${nextStatus}.`
        })
      });
      setMessage(`Ticket updated to ${nextStatus}.`);
      await loadTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update ticket status.");
    } finally {
      setActionBusy(false);
    }
  }

  function confirmAdminTicketStatus(nextStatus: "CLOSED" | "CANCELLED") {
    if (!ticket) return;
    const label = nextStatus === "CLOSED" ? "close" : "cancel";
    const confirmed = window.confirm(`Are you sure you want to ${label} ticket ${ticket.ticketNumber}?`);
    if (!confirmed) return;
    void updateTicketStatus(nextStatus);
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-6xl">
        <header className="field-header">
          <div>
            <nav className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[#5f6368] dark:text-[#a8b0ba]">
              <Link className="field-link" href="/admin">
                Home
              </Link>
              <span>/</span>
              <Link className="field-link" href="/technician/tickets">
                Tickets
              </Link>
              <span>/</span>
              <span>{ticket?.ticketNumber ?? "Detail"}</span>
            </nav>
            <h1 className="field-title">Ticket Detail</h1>
          </div>
          <ThemeToggle />
        </header>

        <AdminMenu />

        {loading ? (
          <section className="field-panel mt-5">
            <p className="field-muted">Loading ticket detail...</p>
          </section>
        ) : null}

        {error ? (
          <div className="field-alert-error mt-5">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="field-alert-success mt-5 p-3 text-sm">
            {message}
          </div>
        ) : null}

        {ticket ? (
          <div className="mt-5 grid gap-5">
            <section className="field-panel">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="field-eyebrow">{ticket.ticketNumber}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{ticket.issueTitle}</h2>
                  <p className="field-muted mt-2 max-w-3xl leading-6">{ticket.issueDescription}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={ticket.status} />
                  <StatusBadge value={ticket.priority} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="field-button-primary" href={`/technician/tickets/${ticket.id}/service-report`}>
                  Submit Service Report
                </Link>
                <Link className="field-button-secondary" href={`/m/${ticket.machine.publicId}/tickets/${ticket.id}`}>
                  Open Ticket Page
                </Link>
                <Link className="field-button-secondary" href="/technician/tickets">
                  Back to Workbench
                </Link>
                {canAdminCloseTicket ? (
                  <>
                    <button
                      className="field-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                      type="button"
                      disabled={actionBusy || ticket.status === "CLOSED"}
                      onClick={() => confirmAdminTicketStatus("CLOSED")}
                    >
                      Close Ticket
                    </button>
                    <button
                      className="grid min-h-10 place-items-center rounded-md border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-800 transition hover:border-red-500 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
                      type="button"
                      disabled={actionBusy || ticket.status === "CANCELLED"}
                      onClick={() => confirmAdminTicketStatus("CANCELLED")}
                    >
                      Cancel Ticket
                    </button>
                  </>
                ) : null}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <DetailGroup title="Requester">
                <InfoLine label="Name" value={ticket.requesterName} />
                <InfoLine label="Phone" value={ticket.requesterPhone || "Not provided"} />
                <InfoLine label="Email" value={ticket.requesterEmail || "Not provided"} />
              </DetailGroup>

              <DetailGroup title="Machine">
                <InfoLine label="Customer" value={ticket.machine.customer.name} />
                <InfoLine label="Machine" value={`${ticket.machine.machineName} / ${ticket.machine.serialNumber}`} />
                <InfoLine label="Location" value={ticket.machine.location} />
                <Link className="field-link" href={`/machines/${ticket.machine.id}/logs`}>
                  View Full Machine Log
                </Link>
              </DetailGroup>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
              <DetailGroup title="Assignment Team">
                {ticket.assignments.length > 0 ? (
                  ticket.assignments.map((assignment) => (
                    <div key={assignment.id} className="field-panel-subtle flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div>
                        <p className="font-medium">{assignment.assignedToUser.name}</p>
                        <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">{assignment.assignedToUser.email}</p>
                      </div>
                      {assignment.isLead ? <StatusBadge value="LEAD" /> : null}
                    </div>
                  ))
                ) : (
                  <p className="field-muted">Unassigned.</p>
                )}
              </DetailGroup>

              <DetailGroup title={`Ticket Attachments (${ticket.attachments.length})`}>
                <AttachmentList attachments={ticket.attachments} />
              </DetailGroup>
            </section>

            <DetailGroup title={`Tasks (${ticket.tasks.length})`}>
              {ticket.tasks.length > 0 ? (
                <div className="grid gap-3">
                  {ticket.tasks.map((task) => (
                    <div key={task.id} className="field-panel-subtle">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <Link className="text-sm font-semibold text-[#155e75] underline-offset-4 hover:underline dark:text-[#67e8f9]" href={`/technician/tasks/${task.id}`}>
                            {task.title}
                          </Link>
                          <p className="field-muted mt-1">
                            {formatDate(task.scheduledStartAt)}
                            {task.scheduledEndAt ? ` to ${formatDate(task.scheduledEndAt)}` : ""}
                          </p>
                          <p className="field-muted mt-1">
                            Assigned: {task.assignments.map((assignment) => assignment.technician.name).join(", ") || "Unassigned"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge value={task.status} />
                          <StatusBadge value={task.taskType} />
                        </div>
                      </div>
                      {task.description ? (
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-neutral-200">{task.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="field-muted">No tasks linked to this ticket.</p>
              )}
            </DetailGroup>

            <DetailGroup title={`Service Reports (${ticket.serviceReports.length})`}>
              {ticket.serviceReports.length > 0 ? (
                <div className="grid gap-3">
                  {ticket.serviceReports.map((report, index) => (
                    <details key={report.id} className="field-panel-subtle">
                      <summary className="cursor-pointer list-none">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold">
                              Report {ticket.serviceReports.length - index} / {report.technician?.name ?? "Unknown technician"}
                            </p>
                            <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                              {formatDate(report.serviceStartAt)} to {formatDate(report.serviceEndAt)}
                            </p>
                            <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                              {acknowledgementSummary(report.acknowledgement)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <StatusBadge value={report.resolutionStatus} />
                            <StatusBadge value={report.acknowledgement?.response ?? "PENDING_ACK"} />
                          </div>
                        </div>
                      </summary>
                      <div className="mt-4 grid gap-3">
                        <InfoLine label="Diagnosis" value={report.diagnosis} />
                        <InfoLine label="Action Taken" value={report.actionTaken} />
                        <InfoLine label="Parts Used" value={report.partsUsed || "None recorded"} />
                        <InfoLine label="Recommendations" value={report.recommendations || "None recorded"} />
                        <InfoLine label="Technician Remarks" value={report.technicianRemarks || "None recorded"} />
                        {report.acknowledgement ? (
                          <div className="rounded-md border border-[#d9dee3] p-3 text-sm dark:border-[#2f3742]">
                            <p className="font-medium">Acknowledgement</p>
                            <InfoLine label="Acknowledged By" value={report.acknowledgement.requesterName || "Pending"} />
                            <InfoLine label="Contact" value={report.acknowledgement.requesterPhone || "Not recorded"} />
                            <InfoLine label="Email" value={report.acknowledgement.requesterEmail || "Not recorded"} />
                            <InfoLine label="Comment" value={report.acknowledgement.requesterComment || "None recorded"} />
                          </div>
                        ) : (
                          <p className="field-muted">No acknowledgement requested.</p>
                        )}
                        <div>
                          <p className="field-meta-label">Report Attachments</p>
                          <div className="mt-2">
                            <AttachmentList attachments={report.attachments} />
                          </div>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <p className="field-muted">No service report yet.</p>
              )}
            </DetailGroup>

            <DetailGroup title={`Comments (${ticket.comments.length})`}>
              {ticket.comments.length > 0 ? (
                <div className="grid gap-3">
                  {ticket.comments.map((comment) => (
                    <div key={comment.id} className="field-panel-subtle">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{comment.createdByUser?.name ?? comment.createdByRequesterName ?? "Requester"}</p>
                        <StatusBadge value={comment.visibility} />
                      </div>
                      <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">{formatDate(comment.createdAt)}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-neutral-200">{comment.comment}</p>
                      {comment.attachments.length > 0 ? (
                        <div className="mt-3">
                          <AttachmentList attachments={comment.attachments} />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="field-muted">No comments yet.</p>
              )}
            </DetailGroup>

            <DetailGroup title={`Status Timeline (${ticket.statusHistory.length})`}>
              <details>
                <summary className="field-panel-subtle cursor-pointer list-none text-sm font-medium">
                  Expand status timeline
                </summary>
                <div className="mt-3 grid gap-3">
                  {ticket.statusHistory.map((history) => (
                    <div key={history.id} className="field-panel-subtle">
                      <p className="text-sm font-medium">{history.fromStatus ?? "Created"} to {history.toStatus}</p>
                      <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">{formatDate(history.createdAt)}</p>
                      {history.comment ? <p className="field-muted mt-2">{history.comment}</p> : null}
                    </div>
                  ))}
                </div>
              </details>
            </DetailGroup>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function DetailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="field-panel">
      <h3 className="field-section-title">{title}</h3>
      <div className="mt-4 grid gap-3">{children}</div>
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

function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return <p className="field-muted">None uploaded.</p>;

  return (
    <div className="grid gap-2">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          className="field-panel-subtle text-sm transition hover:border-[#155e75] dark:hover:border-[#22d3ee]"
          href={attachmentDownloadUrl(attachment.id)}
        >
          <span className="font-medium">{attachment.originalFileName}</span>
          <span className="mt-1 block text-xs text-[#5f6368] dark:text-[#a8b0ba]">
            {formatBytes(attachment.fileSizeBytes)} / {attachment.uploadedByUser?.name ?? attachment.uploadedByRequesterName ?? "Unknown"}
          </span>
        </a>
      ))}
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`status-badge shrink-0 ${statusTone(value)}`}>
      {value}
    </span>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "ASSIGNED":
      return "status-blue";
    case "IN_PROGRESS":
      return "status-cyan";
    case "WAITING_FOR_REQUESTER":
    case "PENDING_ACK":
      return "status-amber";
    case "WAITING_FOR_PARTS":
    case "URGENT":
    case "MACHINE_DOWN":
      return "status-orange";
    case "PENDING_ACKNOWLEDGEMENT":
      return "status-emerald";
    case "FOLLOW_UP_REQUIRED":
      return "status-violet";
    case "RESOLVED":
    case "ACCEPTED":
      return "status-green";
    case "CLOSED":
    case "LEAD":
      return "status-neutral";
    default:
      return "status-neutral";
  }
}

function acknowledgementSummary(acknowledgement: TicketDetail["serviceReports"][number]["acknowledgement"]) {
  if (!acknowledgement) return "Acknowledgement not requested";
  if (!acknowledgement.response) return "Pending requester acknowledgement";
  const name = acknowledgement.requesterName ? ` by ${acknowledgement.requesterName}` : "";
  const date = acknowledgement.acknowledgedAt ? ` on ${formatDate(acknowledgement.acknowledgedAt)}` : "";
  return `${acknowledgement.response.replaceAll("_", " ")}${name}${date}`;
}

function formatDate(value: string | null) {
  if (!value) return "Not confirmed";
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

function attachmentDownloadUrl(id: string) {
  const token = getAccessToken();
  const params = token ? `?accessToken=${encodeURIComponent(token)}` : "";
  return `${apiBaseUrl}/api/attachments/${id}/download${params}`;
}
