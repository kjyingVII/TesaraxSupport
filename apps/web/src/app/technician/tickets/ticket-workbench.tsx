"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminMenu } from "../../../components/admin-menu";
import { ThemeToggle } from "../../../components/theme-toggle";
import { buildServiceReportAcknowledgementMessage } from "../../../lib/acknowledgement-message";
import { apiBaseUrl, apiRequest } from "../../../lib/api";
import { getAccessToken, getAuthUser, type AuthUser } from "../../../lib/auth";

type TicketSummary = {
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
  assignedTechnician: {
    id: string;
    name: string;
    email: string;
  } | null;
  assignments: AssignmentSummary[];
  _count: {
    attachments: number;
    comments: number;
    serviceReports: number;
    statusHistory: number;
  };
};

type AssignmentSummary = {
  id: string;
  assignedToUserId: string;
  isLead: boolean;
  createdAt: string;
  assignedToUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

type TicketDetail = TicketSummary & {
  attachments: Array<{
    id: string;
    originalFileName: string;
    contentType: string;
    fileSizeBytes: number;
    createdAt: string;
    uploadedByUser: {
      name: string;
      email: string;
    } | null;
  }>;
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
    attachments: Array<{
      id: string;
      originalFileName: string;
      contentType: string;
      fileSizeBytes: number;
      createdAt: string;
      uploadedByUser: {
        name: string;
        email: string;
      } | null;
      uploadedByRequesterName: string | null;
    }>;
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    changedByRequesterName: string | null;
    comment: string | null;
    createdAt: string;
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
    attachments: Array<{
      id: string;
      originalFileName: string;
      contentType: string;
      fileSizeBytes: number;
      createdAt: string;
      uploadedByUser: {
        name: string;
        email: string;
      } | null;
    }>;
    acknowledgement: {
      response: string | null;
      requesterName: string | null;
      requesterPhone: string | null;
      requesterEmail: string | null;
      requesterComment: string | null;
      acknowledgedAt: string | null;
      signatureAttachment: {
        id: string;
        originalFileName: string;
        contentType: string;
        fileSizeBytes: number;
        createdAt: string;
      } | null;
    } | null;
  }>;
  acknowledgement: {
    response: string | null;
    requesterName: string | null;
    requesterPhone: string | null;
    requesterEmail: string | null;
    acknowledgedAt: string | null;
  } | null;
};

type TicketListResponse = {
  data: TicketSummary[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type TicketDetailResponse = {
  data: TicketDetail;
};

type AcknowledgementSubmitResponse = {
  data: {
    acknowledgementUrl: string;
    status: string;
    serviceReportId?: string;
  };
};

type SettingsResponse = {
  data: {
    acknowledgementRequiredBeforeClosing: boolean;
    requestAttachmentMaxFileMb: number;
    requestAttachmentMaxTotalMb: number;
  };
};

type Technician = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

type TechnicianListResponse = {
  data: Technician[];
};

const bytesPerMb = 1024 * 1024;

const statusOptions = [
  { label: "All", value: "" },
  { label: "New", value: "NEW" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Waiting Parts", value: "WAITING_FOR_PARTS" },
  { label: "Waiting Requester", value: "WAITING_FOR_REQUESTER" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Pending Ack", value: "PENDING_ACKNOWLEDGEMENT" },
  { label: "Follow Up", value: "FOLLOW_UP_REQUIRED" },
  { label: "Closed", value: "CLOSED" }
];

const actionStatusOptions = [
  { label: "Start Work", value: "IN_PROGRESS" },
  { label: "Waiting Parts", value: "WAITING_FOR_PARTS" },
  { label: "Waiting Requester", value: "WAITING_FOR_REQUESTER" },
  { label: "Resolved", value: "RESOLVED" }
];

type QuickFilter = "" | "MY" | "PENDING_ACK" | "FOLLOW_UP" | "MACHINE_DOWN" | "URGENT";

const quickFilters: Array<{ label: string; value: QuickFilter }> = [
  { label: "All", value: "" },
  { label: "My Tickets", value: "MY" },
  { label: "Pending Ack", value: "PENDING_ACK" },
  { label: "Follow Up", value: "FOLLOW_UP" },
  { label: "Machine Down", value: "MACHINE_DOWN" },
  { label: "Urgent", value: "URGENT" }
];

export function TicketWorkbench() {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [commentVisibility, setCommentVisibility] = useState("INTERNAL");
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [postingComment, setPostingComment] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [assignmentTechnicianIds, setAssignmentTechnicianIds] = useState<string[]>([]);
  const [leadTechnicianId, setLeadTechnicianId] = useState("");
  const [assignmentComment, setAssignmentComment] = useState("");
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [acknowledgementUrl, setAcknowledgementUrl] = useState<string | null>(null);
  const [acknowledgementReportId, setAcknowledgementReportId] = useState<string | null>(null);
  const [meta, setMeta] = useState<TicketListResponse["meta"] | null>(null);
  const [acknowledgementRequiredBeforeClosing, setAcknowledgementRequiredBeforeClosing] = useState(true);
  const [requestAttachmentLimits, setRequestAttachmentLimits] = useState({
    requestAttachmentMaxFileMb: 10,
    requestAttachmentMaxTotalMb: 100
  });
  const [user] = useState<AuthUser | null>(() => getAuthUser());
  const canManageAssignments = user?.role === "ADMIN" || user?.role === "SUPERVISOR";

  useEffect(() => {
    void loadTickets();
    void loadSettings();
    if (canManageAssignments) void loadTechnicians();
  }, []);

  useEffect(() => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      return;
    }

    setAcknowledgementUrl(null);
    setAcknowledgementReportId(null);
    let mounted = true;

    async function loadDetail() {
      setLoadingDetail(true);
      setError(null);

      try {
        const response = await apiRequest<TicketDetailResponse>(`/api/tickets/${selectedTicketId}`);
        if (!mounted) return;
        setSelectedTicket(response.data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load ticket detail.");
      } finally {
        if (mounted) setLoadingDetail(false);
      }
    }

    void loadDetail();

    return () => {
      mounted = false;
    };
  }, [selectedTicketId]);

  useEffect(() => {
    if (!selectedTicket) {
      setAssignmentTechnicianIds([]);
      setLeadTechnicianId("");
      setAssignmentComment("");
      return;
    }

    const activeIds = selectedTicket.assignments.map((assignment) => assignment.assignedToUserId);
    setAssignmentTechnicianIds(activeIds);
    setLeadTechnicianId(
      selectedTicket.assignments.find((assignment) => assignment.isLead)?.assignedToUserId
        ?? selectedTicket.assignedTechnician?.id
        ?? activeIds[0]
        ?? ""
    );
    setAssignmentComment("");
  }, [selectedTicket?.id]);

  const openTicketCount = useMemo(() => {
    return tickets.filter((ticket) => !["CLOSED", "CANCELLED"].includes(ticket.status)).length;
  }, [tickets]);

  async function loadTickets(nextSearch = search, nextStatus = status, nextQuickFilter = quickFilter) {
    setLoadingList(true);
    setError(null);

    const params = new URLSearchParams({
      page: "1",
      pageSize: "25"
    });
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (nextStatus) params.set("status", nextStatus);
    if (nextQuickFilter === "MY" && user?.id) params.set("assignedTechnicianId", user.id);
    if (nextQuickFilter === "PENDING_ACK") params.set("status", "PENDING_ACKNOWLEDGEMENT");
    if (nextQuickFilter === "FOLLOW_UP") params.set("status", "FOLLOW_UP_REQUIRED");
    if (nextQuickFilter === "MACHINE_DOWN") params.set("priority", "MACHINE_DOWN");
    if (nextQuickFilter === "URGENT") params.set("priority", "URGENT");

    try {
      const response = await apiRequest<TicketListResponse>(`/api/tickets?${params.toString()}`);
      setTickets(response.data);
      setMeta(response.meta);
      setSelectedTicketId((current) => current ?? response.data[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tickets.");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadSettings() {
    try {
      const response = await apiRequest<SettingsResponse>("/api/settings");
      setAcknowledgementRequiredBeforeClosing(response.data.acknowledgementRequiredBeforeClosing);
      setRequestAttachmentLimits({
        requestAttachmentMaxFileMb: response.data.requestAttachmentMaxFileMb,
        requestAttachmentMaxTotalMb: response.data.requestAttachmentMaxTotalMb
      });
    } catch {
      setAcknowledgementRequiredBeforeClosing(true);
    }
  }

  async function loadTechnicians() {
    try {
      const response = await apiRequest<TechnicianListResponse>("/api/tickets/technicians");
      setTechnicians(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load technicians.");
    }
  }

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadTickets();
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    setQuickFilter("");
    void loadTickets(search, value, "");
  }

  function handleQuickFilter(value: QuickFilter) {
    setQuickFilter(value);
    if (value === "PENDING_ACK" || value === "FOLLOW_UP") setStatus("");
    void loadTickets(search, value === "PENDING_ACK" || value === "FOLLOW_UP" ? "" : status, value);
  }

  async function refreshSelectedTicket() {
    await loadTickets(search, status, quickFilter);
    if (!selectedTicketId) return;
    const response = await apiRequest<TicketDetailResponse>(`/api/tickets/${selectedTicketId}`);
    setSelectedTicket(response.data);
  }

  async function updateTicketStatus(nextStatus: string) {
    if (!selectedTicket) return;
    setActionBusy(true);
    setActionMessage(null);
    setError(null);

    try {
      await apiRequest(`/api/tickets/${selectedTicket.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: nextStatus,
          changedByUserId: selectedTicket.assignedTechnician?.id,
          comment: `Technician updated status to ${nextStatus}.`
        })
      });
      setActionMessage(`Ticket updated to ${nextStatus}.`);
      await refreshSelectedTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update ticket status.");
    } finally {
      setActionBusy(false);
    }
  }

  async function submitForAcknowledgement() {
    if (!selectedTicket) return;
    setActionBusy(true);
    setActionMessage(null);
    setAcknowledgementUrl(null);
    setAcknowledgementReportId(null);
    setError(null);

    try {
      const response = await apiRequest<AcknowledgementSubmitResponse>(
        `/api/tickets/${selectedTicket.id}/submit-for-acknowledgement`,
        {
          method: "POST",
          body: JSON.stringify({
            submittedByUserId: user?.id
          })
        }
      );
      setAcknowledgementUrl(response.data.acknowledgementUrl);
      setAcknowledgementReportId(response.data.serviceReportId ?? null);
      setActionMessage(
        selectedTicket.status === "PENDING_ACKNOWLEDGEMENT"
          ? "Fresh acknowledgement link generated."
          : "Ticket submitted for acknowledgement."
      );
      await refreshSelectedTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit for acknowledgement.");
    } finally {
      setActionBusy(false);
    }
  }

  async function createServiceReportAcknowledgementLink(serviceReportId: string) {
    if (!selectedTicket) return;
    setActionBusy(true);
    setActionMessage(null);
    setAcknowledgementUrl(null);
    setAcknowledgementReportId(null);
    setError(null);

    try {
      const response = await apiRequest<AcknowledgementSubmitResponse>(
        `/api/service-reports/${serviceReportId}/acknowledgement-link`,
        {
          method: "POST",
          body: JSON.stringify({
            submittedByUserId: user?.id
          })
        }
      );
      setAcknowledgementUrl(response.data.acknowledgementUrl);
      setAcknowledgementReportId(serviceReportId);
      setActionMessage("Direct acknowledgement link generated for this service report.");
      await refreshSelectedTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate acknowledgement link.");
    } finally {
      setActionBusy(false);
    }
  }

  async function copyAcknowledgementUrl() {
    if (!acknowledgementUrl) return;

    try {
      await navigator.clipboard.writeText(acknowledgementUrl);
      setActionMessage("Acknowledgement link copied.");
    } catch {
      setActionMessage("Acknowledgement link generated. Copy it from the Open acknowledgement form button.");
    }
  }

  async function copyAcknowledgementMessage(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setActionMessage("Acknowledgement message copied.");
    } catch {
      setActionMessage("Copy failed. Select and copy the message manually.");
    }
  }

  function toggleAssignedTechnician(technicianId: string) {
    setAssignmentTechnicianIds((current) => {
      if (current.includes(technicianId)) {
        const next = current.filter((id) => id !== technicianId);
        if (leadTechnicianId === technicianId) {
          setLeadTechnicianId(next[0] ?? "");
        }
        return next;
      }

      if (!leadTechnicianId) {
        setLeadTechnicianId(technicianId);
      }
      return [...current, technicianId];
    });
  }

  async function saveAssignments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket) return;

    setSavingAssignments(true);
    setActionMessage(null);
    setError(null);

    try {
      await apiRequest(`/api/tickets/${selectedTicket.id}/assignments`, {
        method: "PATCH",
        body: JSON.stringify({
          assignedTechnicianIds: assignmentTechnicianIds,
          leadTechnicianId: leadTechnicianId || undefined,
          comment: assignmentComment || undefined
        })
      });
      setActionMessage("Assignment team updated.");
      await refreshSelectedTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update assignments.");
    } finally {
      setSavingAssignments(false);
    }
  }

  async function uploadAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket || !attachmentFile) return;
    setUploadingAttachment(true);
    setActionMessage(null);
    setError(null);

    try {
      const currentTotalBytes = selectedTicket.attachments.reduce((total, attachment) => total + attachment.fileSizeBytes, 0);
      const maxFileBytes = requestAttachmentLimits.requestAttachmentMaxFileMb * bytesPerMb;
      const maxTotalBytes = requestAttachmentLimits.requestAttachmentMaxTotalMb * bytesPerMb;

      if (attachmentFile.size > maxFileBytes) {
        throw new Error(`Attachment file must be ${requestAttachmentLimits.requestAttachmentMaxFileMb} MB or smaller.`);
      }

      if (currentTotalBytes + attachmentFile.size > maxTotalBytes) {
        throw new Error(`Ticket attachments cannot exceed ${requestAttachmentLimits.requestAttachmentMaxTotalMb} MB in total.`);
      }

      const dataBase64 = await readFileAsDataUrl(attachmentFile);
      await apiRequest(`/api/tickets/${selectedTicket.id}/attachments`, {
        method: "POST",
        body: JSON.stringify({
          originalFileName: attachmentFile.name,
          contentType: attachmentFile.type || "application/octet-stream",
          dataBase64
        })
      });
      setAttachmentFile(null);
      setActionMessage("Attachment uploaded.");
      await refreshSelectedTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload attachment.");
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTicket || !comment.trim()) return;

    setPostingComment(true);
    setActionMessage(null);
    setError(null);

    try {
      validateFiles(commentFiles, requestAttachmentLimits.requestAttachmentMaxFileMb, requestAttachmentLimits.requestAttachmentMaxTotalMb);
      const preparedAttachments = await Promise.all(
        commentFiles.map(async (attachment) => ({
          originalFileName: attachment.name,
          contentType: attachment.type || "application/octet-stream",
          dataBase64: await readFileAsDataUrl(attachment)
        }))
      );
      await apiRequest(`/api/tickets/${selectedTicket.id}/comments`, {
        method: "POST",
        body: JSON.stringify({
          comment,
          visibility: commentVisibility,
          attachments: preparedAttachments
        })
      });
      setComment("");
      setCommentVisibility("INTERNAL");
      setCommentFiles([]);
      setActionMessage(commentVisibility === "REQUESTER_VISIBLE" ? "Requester-visible reply added." : "Internal note added.");
      await refreshSelectedTicket();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add note.");
    } finally {
      setPostingComment(false);
    }
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
              <span>Tickets</span>
            </nav>
            <h1 className="field-title">Ticket Workbench</h1>
          </div>
          <ThemeToggle />
        </header>

        <AdminMenu />

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Total Tickets" value={meta?.total ?? tickets.length} />
          <Metric label="Open On Page" value={openTicketCount} />
          <Metric label="Selected" value={selectedTicket?.ticketNumber ?? "-"} />
        </section>

        <form className="field-panel mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto]" onSubmit={handleFilter}>
          <label className="block">
            <span className="field-label">Search</span>
            <input
              className="field-input h-11"
              value={search}
              placeholder="Ticket, requester, machine, serial"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="field-label">Status</span>
            <select
              className="field-input h-11"
              value={status}
              onChange={(event) => handleStatusChange(event.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="field-button-primary md:mt-7"
            type="submit"
          >
            Apply
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter.value || "all"}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                quickFilter === filter.value
                  ? "border-[#155e75] bg-cyan-50 text-[#155e75] dark:border-[#22d3ee] dark:bg-[#10242a] dark:text-[#67e8f9]"
                  : "border-[#d9dee3] text-[#3c4043] hover:border-[#155e75] dark:border-[#2f3742] dark:text-[#d9dee3] dark:hover:border-[#22d3ee]"
              }`}
              type="button"
              onClick={() => handleQuickFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="field-alert-error mt-5">
            {error}
          </div>
        ) : null}

        {actionMessage ? (
          <div className="field-alert-success mt-5 p-4 text-sm">
            <p>{actionMessage}</p>
            {acknowledgementUrl ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  className="inline-flex min-h-10 items-center rounded-md border border-emerald-300 px-3 font-medium underline-offset-4 hover:underline dark:border-emerald-800"
                  href={acknowledgementUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open acknowledgement form
                </a>
                <button
                  className="inline-flex min-h-10 items-center rounded-md border border-emerald-300 px-3 font-medium underline-offset-4 hover:underline dark:border-emerald-800"
                  type="button"
                  onClick={copyAcknowledgementUrl}
                >
                  Copy link
                </button>
                {acknowledgementReportId ? (
                  <span className="inline-flex min-h-10 items-center text-xs text-emerald-900 dark:text-emerald-100">
                    Link is for selected service report.
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 grid flex-1 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="field-panel p-0">
            <div className="border-b border-[#d9dee3] p-4 dark:border-[#2f3742]">
              <h2 className="field-section-title">Tickets</h2>
              <p className="field-muted mt-1">
                {loadingList ? "Loading..." : `${tickets.length} shown`}
              </p>
            </div>

            <div className="divide-y divide-[#d9dee3] dark:divide-[#2f3742]">
              {!loadingList && tickets.length === 0 ? (
                <p className="field-muted p-4">No tickets found.</p>
              ) : null}

              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  className={`w-full p-4 text-left transition hover:bg-cyan-50/60 dark:hover:bg-[#1f242d] ${
                    selectedTicketId === ticket.id ? "bg-cyan-50 dark:bg-[#1f242d]" : ""
                  }`}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{ticket.ticketNumber}</p>
                      <p className="mt-1 truncate text-sm text-neutral-700 dark:text-neutral-200">{ticket.issueTitle}</p>
                    </div>
                    <StatusBadge value={ticket.status} />
                  </div>
                  <p className="field-muted mt-2">
                    {ticket.machine.machineName} / {ticket.machine.serialNumber}
                  </p>
                  <p className="mt-2 text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                    Team: {assignmentNames(ticket.assignments) || ticket.assignedTechnician?.name || "Unassigned"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                    <span className="rounded-md border border-[#d9dee3] px-2 py-1 dark:border-[#2f3742]">{ticket.priority}</span>
                    <span className="rounded-md border border-[#d9dee3] px-2 py-1 dark:border-[#2f3742]">{ticket.machine.customer.name}</span>
                    <span className="rounded-md border border-[#d9dee3] px-2 py-1 dark:border-[#2f3742]">{formatDate(ticket.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="field-panel p-0">
            <div className="border-b border-[#d9dee3] p-4 dark:border-[#2f3742]">
              <h2 className="field-section-title">Ticket Detail</h2>
              <p className="field-muted mt-1">
                {loadingDetail ? "Loading detail..." : selectedTicket?.ticketNumber ?? "Select a ticket"}
              </p>
            </div>

            {selectedTicket ? (
              <div className="grid gap-5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedTicket.issueTitle}</h3>
                    <p className="field-muted mt-2 leading-6">
                      {selectedTicket.issueDescription}
                    </p>
                  </div>
                  <StatusBadge value={selectedTicket.status} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <DetailGroup title="Requester">
                    <InfoLine label="Name" value={selectedTicket.requesterName} />
                    <InfoLine label="Phone" value={selectedTicket.requesterPhone || "Not provided"} />
                    <InfoLine label="Email" value={selectedTicket.requesterEmail || "Not provided"} />
                  </DetailGroup>

                  <DetailGroup title="Machine">
                    <InfoLine label="Customer" value={selectedTicket.machine.customer.name} />
                    <InfoLine label="Machine" value={selectedTicket.machine.machineName} />
                    <InfoLine label="Serial No." value={selectedTicket.machine.serialNumber} />
                    <InfoLine label="Location" value={selectedTicket.machine.location} />
                    <a
                      className="field-link"
                      href={`/machines/${selectedTicket.machine.id}/logs`}
                    >
                      View Full Machine Log
                    </a>
                  </DetailGroup>
                </div>

                <DetailGroup title="Assignment Team">
                  {selectedTicket.assignments.length > 0 ? (
                    <div className="grid gap-2">
                      {selectedTicket.assignments.map((assignment) => (
                        <div key={assignment.id} className="field-panel-subtle flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div>
                            <p className="font-medium">{assignment.assignedToUser.name}</p>
                            <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">{assignment.assignedToUser.email}</p>
                          </div>
                          {assignment.isLead ? <span className="status-badge status-cyan">Lead</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="field-muted">No technicians assigned.</p>
                  )}

                  {canManageAssignments ? (
                    <form className="mt-2 grid gap-3 border-t border-[#d9dee3] pt-4 dark:border-[#2f3742]" onSubmit={saveAssignments}>
                      <div className="grid gap-2">
                        {technicians.length === 0 ? <p className="field-muted">No active technicians found.</p> : null}
                        {technicians.map((technician) => {
                          const checked = assignmentTechnicianIds.includes(technician.id);

                          return (
                            <label key={technician.id} className="field-panel-subtle flex items-start gap-3 text-sm">
                              <input
                                className="mt-1"
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleAssignedTechnician(technician.id)}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block font-medium">{technician.name}</span>
                                <span className="mt-1 block text-xs text-[#5f6368] dark:text-[#a8b0ba]">{technician.email}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      <label className="block">
                        <span className="field-label">Lead Technician</span>
                        <select
                          className="field-input h-11"
                          value={leadTechnicianId}
                          disabled={assignmentTechnicianIds.length === 0}
                          onChange={(event) => setLeadTechnicianId(event.target.value)}
                        >
                          {assignmentTechnicianIds.length === 0 ? <option value="">No lead technician</option> : null}
                          {technicians
                            .filter((technician) => assignmentTechnicianIds.includes(technician.id))
                            .map((technician) => (
                              <option key={technician.id} value={technician.id}>
                                {technician.name}
                              </option>
                            ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="field-label">Assignment Note</span>
                        <input
                          className="field-input h-11"
                          value={assignmentComment}
                          onChange={(event) => setAssignmentComment(event.target.value)}
                        />
                      </label>

                      <button
                        className="field-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                        type="submit"
                        disabled={savingAssignments}
                      >
                        {savingAssignments ? "Saving..." : "Save Assignment Team"}
                      </button>
                    </form>
                  ) : null}
                </DetailGroup>

                <DetailGroup title="Technician Actions">
                  <Link
                    className="field-button-secondary"
                    href={`/technician/tickets/${selectedTicket.id}`}
                  >
                    Show Ticket Detail
                  </Link>
                  <div>
                    <p className="field-meta-label mb-2">Change Ticket Status</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {actionStatusOptions.map((option) => (
                        <button
                          key={option.value}
                          className="field-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                          type="button"
                          disabled={actionBusy || selectedTicket.status === option.value}
                          onClick={() => updateTicketStatus(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    className="field-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    disabled={actionBusy || selectedTicket.status !== "RESOLVED" || (acknowledgementRequiredBeforeClosing && selectedTicket.serviceReports.length === 0)}
                    onClick={() => {
                      if (acknowledgementRequiredBeforeClosing) {
                        void submitForAcknowledgement();
                      } else {
                        void updateTicketStatus("CLOSED");
                      }
                    }}
                  >
                    {acknowledgementRequiredBeforeClosing ? "Submit For Acknowledgement" : "Close Ticket"}
                  </button>
                  {selectedTicket.status === "PENDING_ACKNOWLEDGEMENT" ? (
                    <a
                      className="field-button-secondary"
                      href={`/m/${selectedTicket.machine.publicId}/tickets/${selectedTicket.id}`}
                    >
                      Open Ticket Page
                    </a>
                  ) : null}
                  <a
                    className="field-button-secondary"
                    href={`/technician/tickets/${selectedTicket.id}/service-report`}
                  >
                    Submit Service Report
                  </a>
                </DetailGroup>

                <DetailGroup title={`Attachments (${selectedTicket.attachments.length})`}>
                  <p className="field-muted mb-3">
                    Maximum {requestAttachmentLimits.requestAttachmentMaxFileMb} MB per file, {requestAttachmentLimits.requestAttachmentMaxTotalMb} MB total per ticket.
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

                  {selectedTicket.attachments.length > 0 ? (
                    <div className="mt-4 grid gap-2">
                      {selectedTicket.attachments.map((attachment) => (
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
                    <p className="field-muted mt-4">No attachments uploaded.</p>
                  )}
                </DetailGroup>

                <DetailGroup title={`Comments (${selectedTicket.comments.length})`}>
                  {selectedTicket.comments.length > 0 ? (
                    <div className="grid gap-2">
                      {selectedTicket.comments.map((item) => (
                        <div key={item.id} className="field-panel-subtle">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium">{item.createdByUser?.name ?? item.createdByRequesterName ?? "Unknown"}</p>
                            <span className={`status-badge ${item.visibility === "REQUESTER_VISIBLE" ? "status-blue" : "status-neutral"}`}>{item.visibility}</span>
                          </div>
                          <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">{formatDate(item.createdAt)}</p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-neutral-200">{item.comment}</p>
                          {item.attachments.length > 0 ? (
                            <div className="mt-3 grid gap-2">
                              {item.attachments.map((attachment) => (
                                <a
                                  key={attachment.id}
                                  className="field-panel-subtle p-2 text-sm transition hover:border-[#155e75] dark:hover:border-[#22d3ee]"
                                  href={attachmentDownloadUrl(attachment.id)}
                                >
                                  <span className="font-medium">{attachment.originalFileName}</span>
                                  <span className="mt-1 block text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                                    {formatBytes(attachment.fileSizeBytes)} / {attachment.uploadedByUser?.name ?? attachment.uploadedByRequesterName ?? "Unknown"}
                                  </span>
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="field-muted mt-2">No comments yet.</p>
                  )}

                  <form className="mt-4 grid gap-3 border-t border-[#d9dee3] pt-4 dark:border-[#2f3742]" onSubmit={addComment}>
                    <textarea
                      className="field-textarea min-h-24"
                      placeholder="Add internal notes or a requester-visible reply."
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                    />
                    <label className="block">
                      <span className="field-label">Visibility</span>
                      <select
                        className="field-input h-11"
                        value={commentVisibility}
                        onChange={(event) => setCommentVisibility(event.target.value)}
                      >
                        <option value="INTERNAL">Internal only</option>
                        <option value="REQUESTER_VISIBLE">Visible to requester</option>
                      </select>
                    </label>
                    <div className="grid gap-2">
                      <p className="field-muted">
                        Attach files to this comment: max {requestAttachmentLimits.requestAttachmentMaxFileMb} MB per file, {requestAttachmentLimits.requestAttachmentMaxTotalMb} MB total.
                      </p>
                      <input
                        className="field-input py-2 text-sm"
                        type="file"
                        multiple
                        onChange={(event) => setCommentFiles(Array.from(event.target.files ?? []))}
                      />
                      {commentFiles.length > 0 ? (
                        <p className="text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                          Selected: {commentFiles.map((file) => file.name).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <button
                      className="field-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                      type="submit"
                      disabled={postingComment || !comment.trim()}
                    >
                      {postingComment ? "Adding..." : "Add Comment"}
                    </button>
                  </form>
                </DetailGroup>

                <DetailGroup title={`Service Reports (${selectedTicket.serviceReports.length})`}>
                  {selectedTicket.serviceReports.length > 0 ? (
                    <div className="grid gap-3">
                      {selectedTicket.serviceReports.map((report, index) => (
                        <details
                          key={report.id}
                          className="field-panel-subtle"
                        >
                          <summary className="cursor-pointer list-none">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold">
                                  Report {selectedTicket.serviceReports.length - index} / {report.technician?.name ?? "Unknown technician"}
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
                            <InfoLine label="Submitted By" value={report.technician?.name ?? "Unknown technician"} />
                            <InfoLine label="Diagnosis" value={report.diagnosis} />
                            <InfoLine label="Action Taken" value={report.actionTaken} />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <InfoLine label="Service Start" value={formatDate(report.serviceStartAt)} />
                              <InfoLine label="Service End" value={formatDate(report.serviceEndAt)} />
                            </div>
                            <InfoLine label="Parts Used" value={report.partsUsed || "None recorded"} />
                            <InfoLine label="Recommendations" value={report.recommendations || "None recorded"} />
                            <InfoLine label="Technician Remarks" value={report.technicianRemarks || "None recorded"} />
                            <div>
                              <p className="field-meta-label">Acknowledgement</p>
                              {report.acknowledgement ? (
                                <div className="mt-2 rounded-md border border-[#d9dee3] bg-white p-3 text-sm dark:border-[#2f3742] dark:bg-[#0f1115]">
                                  <p className="font-medium">
                                    {report.acknowledgement.response
                                      ? report.acknowledgement.response.replaceAll("_", " ")
                                      : "Pending requester signature"}
                                  </p>
                                  {report.acknowledgement.requesterName ? (
                                    <p className="field-muted mt-1">
                                      {report.acknowledgement.requesterName}
                                      {report.acknowledgement.acknowledgedAt ? ` / ${formatDate(report.acknowledgement.acknowledgedAt)}` : ""}
                                    </p>
                                  ) : null}
                                  {!report.acknowledgement.response ? (
                                    <div className="mt-3 grid gap-2">
                                      <button
                                        className="field-button-secondary min-h-10 disabled:cursor-not-allowed disabled:opacity-50"
                                        type="button"
                                        disabled={actionBusy}
                                        onClick={() => createServiceReportAcknowledgementLink(report.id)}
                                      >
                                        {actionBusy ? "Generating..." : "Get Direct Acknowledgement Link"}
                                      </button>
                                      {acknowledgementReportId === report.id && acknowledgementUrl ? (
                                        <DirectAcknowledgementLink
                                          url={acknowledgementUrl}
                                          message={buildTicketServiceReportMessage(acknowledgementUrl, selectedTicket, report)}
                                          onCopy={copyAcknowledgementUrl}
                                          onCopyMessage={copyAcknowledgementMessage}
                                        />
                                      ) : null}
                                    </div>
                                  ) : null}
                                  <details className="group mt-3 rounded-md border border-[#d9dee3] bg-white p-3 dark:border-[#2f3742] dark:bg-[#0f1115]">
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                                      <span className="text-sm font-medium">More Info</span>
                                      <span className="text-sm font-medium text-[#155e75] group-open:hidden dark:text-[#67e8f9]">Expand</span>
                                      <span className="hidden text-sm font-medium text-[#155e75] group-open:inline dark:text-[#67e8f9]">Collapse</span>
                                    </summary>
                                    <div className="mt-3 grid gap-3">
                                      <div className="grid gap-3 sm:grid-cols-2">
                                        <InfoLine label="Contact Number" value={report.acknowledgement.requesterPhone || "Not recorded"} />
                                        <InfoLine label="Email" value={report.acknowledgement.requesterEmail || "Not recorded"} />
                                      </div>
                                      {report.acknowledgement.requesterComment ? (
                                        <p className="whitespace-pre-wrap leading-6 text-neutral-700 dark:text-neutral-200">
                                          {report.acknowledgement.requesterComment}
                                        </p>
                                      ) : null}
                                      <SignaturePreview attachmentId={report.acknowledgement.signatureAttachment?.id ?? null} />
                                    </div>
                                  </details>
                                </div>
                              ) : (
                                <div className="mt-2 grid gap-3">
                                  <p className="text-sm leading-6 text-neutral-800 dark:text-neutral-200">No acknowledgement requested</p>
                                  <button
                                    className="field-button-secondary min-h-10 disabled:cursor-not-allowed disabled:opacity-50"
                                    type="button"
                                    disabled={actionBusy}
                                    onClick={() => createServiceReportAcknowledgementLink(report.id)}
                                  >
                                    {actionBusy ? "Generating..." : "Get Direct Acknowledgement Link"}
                                  </button>
                                  {acknowledgementReportId === report.id && acknowledgementUrl ? (
                                    <DirectAcknowledgementLink
                                      url={acknowledgementUrl}
                                      message={buildTicketServiceReportMessage(acknowledgementUrl, selectedTicket, report)}
                                      onCopy={copyAcknowledgementUrl}
                                      onCopyMessage={copyAcknowledgementMessage}
                                    />
                                  ) : null}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="field-meta-label">Attachments</p>
                              {report.attachments.length > 0 ? (
                                <div className="mt-2 grid gap-2">
                                  {report.attachments.map((attachment) => (
                                    <a
                                      key={attachment.id}
                                      className="field-panel-subtle p-2 text-sm transition hover:border-[#155e75] dark:hover:border-[#22d3ee]"
                                      href={attachmentDownloadUrl(attachment.id)}
                                    >
                                      <span className="font-medium">{attachment.originalFileName}</span>
                                      <span className="mt-1 block text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                                        {formatBytes(attachment.fileSizeBytes)} / {attachment.uploadedByUser?.name ?? "Unknown"}
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-1 text-sm leading-6 text-neutral-800 dark:text-neutral-200">None uploaded</p>
                              )}
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : (
                    <p className="field-muted">No service report yet.</p>
                  )}
                </DetailGroup>

                <DetailGroup title="Status History">
                  <div className="grid gap-3">
                    {selectedTicket.statusHistory.slice(0, 5).map((history) => (
                      <div key={history.id} className="field-panel-subtle">
                        <p className="text-sm font-medium">
                          {history.fromStatus ?? "Created"} to {history.toStatus}
                        </p>
                        <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">{formatDate(history.createdAt)}</p>
                        {history.comment ? (
                          <p className="field-muted mt-2">{history.comment}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </DetailGroup>
              </div>
            ) : (
              <p className="field-muted p-4">Select a ticket to view details.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="field-panel">
      <p className="field-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#d9dee3] p-4 dark:border-[#2f3742]">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 grid gap-3">{children}</div>
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

function DirectAcknowledgementLink({
  url,
  message,
  onCopy,
  onCopyMessage
}: {
  url: string;
  message: string;
  onCopy: () => void;
  onCopyMessage: (message: string) => void;
}) {
  return (
    <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950">
      <p className="font-medium text-emerald-950 dark:text-emerald-100">Direct link ready</p>
      <p className="mt-1 break-all text-xs text-emerald-900 dark:text-emerald-100">{url}</p>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-emerald-200 bg-white p-3 text-xs leading-5 text-neutral-800 dark:border-emerald-900 dark:bg-[#0f1115] dark:text-neutral-100">
        {message}
      </pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          className="inline-flex min-h-9 items-center rounded-md border border-emerald-300 px-3 font-medium underline-offset-4 hover:underline dark:border-emerald-800"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          Open form
        </a>
        <button
          className="inline-flex min-h-9 items-center rounded-md border border-emerald-300 px-3 font-medium underline-offset-4 hover:underline dark:border-emerald-800"
          type="button"
          onClick={() => onCopyMessage(message)}
        >
          Copy message
        </button>
        <button
          className="inline-flex min-h-9 items-center rounded-md border border-emerald-300 px-3 font-medium underline-offset-4 hover:underline dark:border-emerald-800"
          type="button"
          onClick={onCopy}
        >
          Copy link
        </button>
      </div>
    </div>
  );
}

function buildTicketServiceReportMessage(
  acknowledgementUrl: string,
  ticket: TicketDetail,
  report: TicketDetail["serviceReports"][number]
) {
  return buildServiceReportAcknowledgementMessage({
    acknowledgementUrl,
    ticketNumber: ticket.ticketNumber,
    customerName: ticket.machine.customer.name,
    machineName: ticket.machine.machineName,
    model: ticket.machine.model,
    serialNumber: ticket.machine.serialNumber,
    location: ticket.machine.location,
    issueTitle: ticket.issueTitle,
    serviceStartAt: report.serviceStartAt,
    serviceEndAt: report.serviceEndAt,
    technicianName: report.technician?.name,
    diagnosis: report.diagnosis,
    actionTaken: report.actionTaken,
    resolutionStatus: report.resolutionStatus
  });
}

function SignaturePreview({ attachmentId }: { attachmentId: string | null }) {
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attachmentId) {
      setSignatureDataUrl(null);
      setError(null);
      return;
    }
    const currentAttachmentId = attachmentId;

    let cancelled = false;
    async function loadSignature() {
      try {
        const response = await fetch(attachmentDownloadUrl(currentAttachmentId));
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
  }, [attachmentId]);

  if (!attachmentId) {
    return <p className="field-muted mt-3">Signature file is not attached.</p>;
  }

  return (
    <div className="mt-3">
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
      return "status-amber";
    case "WAITING_FOR_PARTS":
      return "status-orange";
    case "PENDING_ACKNOWLEDGEMENT":
      return "status-emerald";
    case "FOLLOW_UP_REQUIRED":
      return "status-violet";
    case "RESOLVED":
    case "ACCEPTED":
      return "status-green";
    case "CLOSED":
      return "status-neutral";
    default:
      return "status-neutral";
  }
}

function assignmentNames(assignments: AssignmentSummary[]) {
  return assignments
    .map((assignment) => assignment.isLead ? `${assignment.assignedToUser.name} (Lead)` : assignment.assignedToUser.name)
    .join(", ");
}

function acknowledgementSummary(acknowledgement: TicketDetail["serviceReports"][number]["acknowledgement"]) {
  if (!acknowledgement) return "Acknowledgement not requested";
  if (!acknowledgement.response) return "Pending requester acknowledgement";
  const name = acknowledgement.requesterName ? ` by ${acknowledgement.requesterName}` : "";
  const date = acknowledgement.acknowledgedAt ? ` on ${formatDate(acknowledgement.acknowledgedAt)}` : "";
  return `${acknowledgement.response.replaceAll("_", " ")}${name}${date}`;
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

function validateFiles(files: File[], maxFileMb: number, maxTotalMb: number) {
  const maxFileBytes = maxFileMb * bytesPerMb;
  const maxTotalBytes = maxTotalMb * bytesPerMb;
  const totalBytes = files.reduce((total, file) => total + file.size, 0);

  for (const file of files) {
    if (file.size === 0) {
      throw new Error("Attachment file cannot be empty.");
    }

    if (file.size > maxFileBytes) {
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

function attachmentDownloadUrl(id: string) {
  const token = getAccessToken();
  const params = token ? `?accessToken=${encodeURIComponent(token)}` : "";
  return `${apiBaseUrl}/api/attachments/${id}/download${params}`;
}
