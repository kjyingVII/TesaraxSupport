"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminMenu } from "../../../../components/admin-menu";
import { ThemeToggle } from "../../../../components/theme-toggle";
import { buildMachineLogAcknowledgementMessage } from "../../../../lib/acknowledgement-message";
import { apiBaseUrl, apiRequest } from "../../../../lib/api";
import { getAccessToken } from "../../../../lib/auth";

type MachineDetail = {
  id: string;
  machineName: string;
  model: string;
  serialNumber: string;
  location: string;
  serviceReminderIntervalDays: number;
  lastServiceAt: string | null;
  nextServiceDueAt: string | null;
  customer: {
    name: string;
  };
};

type TimelineItem = {
  type: "MACHINE_LOG" | "TICKET";
  activityType: ActivityType | null;
  eventDate: string;
  title: string;
  summary: string;
  status: string | null;
  relatedId: string;
  relatedNumber: string | null;
  attachmentCount: number;
  actorName: string | null;
};

type MachineLogDetail = {
  id: string;
  activityType: ActivityType;
  workDate: string;
  workEndAt: string | null;
  title: string;
  workSummary: string;
  partsUsed: string | null;
  upgradeVersion: string | null;
  upgradeDescription: string | null;
  nextServiceDueOverrideAt: string | null;
  requesterConfirmedName: string | null;
  requesterContactPhone: string | null;
  requesterContactEmail: string | null;
  requesterAcknowledgementRequired: boolean;
  notifyCustomer: boolean;
  notifyRecipientName: string | null;
  notifyRecipientPhone: string | null;
  notifyRecipientEmail: string | null;
  notifyMessage: string | null;
  notifiedAt: string | null;
  loggedByRequesterName: string | null;
  ticket: {
    ticketNumber: string;
    issueTitle: string;
    status: string;
    requesterName: string;
    requesterPhone: string | null;
    requesterEmail: string | null;
  } | null;
  serviceReport: {
    diagnosis: string;
    actionTaken: string;
    resolutionStatus: string;
  } | null;
  loggedByUser: {
    name: string;
    email: string;
  } | null;
  acknowledgement: {
    id: string;
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
  } | null;
  attachments: Array<{
    id: string;
    originalFileName: string;
    contentType: string;
    fileSizeBytes: number;
    createdAt: string;
    uploadedByRequesterName: string | null;
    uploadedByUser: {
      name: string;
      email: string;
    } | null;
  }>;
};

type MachineDocument = {
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
  requesterName: string;
  requesterPhone: string | null;
  requesterEmail: string | null;
  issueTitle: string;
  issueDescription: string;
  issueCategory: string;
  priority: string;
  status: string;
  createdAt: string;
  serviceReports: Array<{
    diagnosis: string;
    actionTaken: string;
    resolutionStatus: string;
    serviceStartAt: string;
    serviceEndAt: string;
  }>;
  acknowledgement: {
    response: string | null;
    requesterName: string | null;
    requesterPhone: string | null;
    requesterEmail: string | null;
    acknowledgedAt: string | null;
  } | null;
};

type MachineResponse = {
  data: MachineDetail;
};

type TimelineResponse = {
  data: TimelineItem[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type MachineLogDetailResponse = {
  data: MachineLogDetail;
};

type TicketDetailResponse = {
  data: TicketDetail;
};

type MachineDocumentsResponse = {
  data: MachineDocument[];
};

type SelectedDetail =
  | { kind: "MACHINE_LOG"; item: TimelineItem; data: MachineLogDetail }
  | { kind: "TICKET"; item: TimelineItem; data: TicketDetail };

const typeFilters = [
  { label: "All", value: "" },
  { label: "Machine Logs", value: "MACHINE_LOG" },
  { label: "Corrective Service", value: "CORRECTIVE_SERVICE" },
  { label: "Machine Maintenance", value: "MACHINE_MAINTENANCE" },
  { label: "Component Replacement", value: "COMPONENT_REPLACEMENT" },
  { label: "Inspection / Diagnosis", value: "INSPECTION_DIAGNOSIS" },
  { label: "Upgrade", value: "UPGRADE" },
  { label: "Other", value: "OTHER" },
  { label: "Ticket", value: "TICKET" }
];

export function MachineLogPage({ machineId }: { machineId: string }) {
  const [machine, setMachine] = useState<MachineDetail | null>(null);
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<SelectedDetail | null>(null);
  const [documents, setDocuments] = useState<MachineDocument[]>([]);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<TimelineResponse["meta"] | null>(null);

  useEffect(() => {
    void loadPage();
  }, []);

  const serviceStatus = useMemo(() => {
    if (!machine?.nextServiceDueAt) return "No reminder";
    const due = new Date(machine.nextServiceDueAt).getTime();
    const now = Date.now();
    const days = Math.ceil((due - now) / (24 * 60 * 60 * 1000));
    if (days < 0) return `${Math.abs(days)} day(s) overdue`;
    if (days === 0) return "Due today";
    return `Due in ${days} day(s)`;
  }, [machine]);

  async function loadPage(nextType = type, nextSearch = search) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: "1",
      pageSize: "50"
    });
    if (nextType) params.set("type", nextType);
    if (nextSearch.trim()) params.set("search", nextSearch.trim());

    try {
      const [machineResponse, timelineResponse] = await Promise.all([
        apiRequest<MachineResponse>(`/api/machines/${machineId}`),
        apiRequest<TimelineResponse>(`/api/machines/${machineId}/timeline?${params.toString()}`)
      ]);
      setMachine(machineResponse.data);
      setItems(timelineResponse.data);
      setMeta(timelineResponse.meta);
      await loadDocuments();
      setSelectedDetail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load machine log.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDocuments() {
    const response = await apiRequest<MachineDocumentsResponse>(`/api/machines/${machineId}/documents`);
    setDocuments(response.data);
  }

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentFile) return;

    setUploadingDocument(true);
    setError(null);

    try {
      const dataBase64 = await readFileAsDataUrl(documentFile);
      await apiRequest(`/api/machines/${machineId}/documents`, {
        method: "POST",
        body: JSON.stringify({
          originalFileName: documentFile.name,
          contentType: documentFile.type || "application/octet-stream",
          dataBase64
        })
      });
      setDocumentFile(null);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload machine document.");
    } finally {
      setUploadingDocument(false);
    }
  }

  async function loadItemDetail(item: TimelineItem) {
    setLoadingDetail(true);
    setError(null);

    try {
      if (item.type === "TICKET") {
        const response = await apiRequest<TicketDetailResponse>(`/api/tickets/${item.relatedId}`);
        setSelectedDetail({ kind: "TICKET", item, data: response.data });
      } else {
        const response = await apiRequest<MachineLogDetailResponse>(
          `/api/machines/${machineId}/logs/${item.relatedId}`
        );
        setSelectedDetail({ kind: "MACHINE_LOG", item, data: response.data });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load timeline detail.");
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadPage();
  }

  function handleTypeChange(value: string) {
    setType(value);
    void loadPage(value, search);
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-7xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">Machine History</p>
            <h1 className="field-title">Full Machine Log</h1>
          </div>
          <ThemeToggle />
        </header>

        <AdminMenu />

        {machine ? (
          <section className="field-panel mt-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="field-muted">{machine.customer.name}</p>
                <h2 className="mt-1 text-xl font-semibold">{machine.machineName}</h2>
                <p className="field-muted mt-2">
                  {machine.model} / {machine.serialNumber}
                </p>
                <p className="field-muted mt-1">{machine.location}</p>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[520px]">
                <MiniMetric label="Last Machine Maintenance" value={machine.lastServiceAt ? formatDate(machine.lastServiceAt) : "None"} />
                <MiniMetric label="Next Machine Maintenance" value={machine.nextServiceDueAt ? formatDate(machine.nextServiceDueAt) : "Not set"} />
                <MiniMetric label="Maintenance Reminder" value={serviceStatus} />
              </div>
            </div>
          </section>
        ) : null}

        <div className="mt-5 flex justify-end">
          <a
            className="field-button-primary"
            href={`/machines/${machineId}/logs/new`}
          >
            Add Machine Log
          </a>
        </div>

        <section className="field-panel mt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="field-section-title">Machine Documents</h2>
              <p className="field-muted mt-1">Upload operation manuals, setup guides, drawings, or other machine files.</p>
            </div>
            <form className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto]" onSubmit={uploadDocument}>
              <input
                className="field-input h-11 py-2 text-sm"
                type="file"
                onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)}
              />
              <button
                className="field-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                disabled={uploadingDocument || !documentFile}
              >
                {uploadingDocument ? "Uploading..." : "Upload Document"}
              </button>
            </form>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {documents.length === 0 ? <p className="field-muted">No machine documents uploaded.</p> : null}
            {documents.map((document) => (
              <a
                key={document.id}
                className="field-panel-subtle text-sm transition hover:border-[#155e75] dark:hover:border-[#22d3ee]"
                href={attachmentDownloadUrl(document.id)}
              >
                <span className="font-medium">{document.originalFileName}</span>
                <span className="mt-1 block text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                  {formatBytes(document.fileSizeBytes)} / {document.uploadedByUser?.name ?? "Unknown"} / {formatDate(document.createdAt)}
                </span>
              </a>
            ))}
          </div>
        </section>

        {error ? (
          <div className="field-alert-error mt-5">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <section className="field-panel p-0">
            <div className="border-b border-[#d9dee3] p-5 dark:border-[#2f3742]">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="field-section-title">Timeline</h2>
                  <p className="field-muted mt-1">
                    {loading ? "Loading..." : `${meta?.total ?? items.length} event(s)`}
                  </p>
                </div>
                <form className="grid gap-3 sm:grid-cols-[180px_1fr_auto]" onSubmit={handleFilter}>
                  <select
                    className="field-input mt-0 h-11"
                    value={type}
                    onChange={(event) => handleTypeChange(event.target.value)}
                  >
                    {typeFilters.map((option) => (
                      <option key={option.value || "all"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="field-input mt-0 h-11"
                    value={search}
                    placeholder="Search logs and tickets"
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <button
                    className="field-button-primary"
                    type="submit"
                  >
                    Apply
                  </button>
                </form>
              </div>
            </div>

            <div className="divide-y divide-[#d9dee3] dark:divide-[#2f3742]">
              {!loading && items.length === 0 ? (
                <p className="field-muted p-5">No timeline items found.</p>
              ) : null}

              {items.map((item) => (
                <button
                  key={`${item.type}-${item.relatedId}`}
                  className={`w-full p-5 text-left transition hover:bg-cyan-50/60 dark:hover:bg-[#1f242d] ${
                    selectedDetail?.item.relatedId === item.relatedId ? "bg-cyan-50 dark:bg-[#1f242d]" : ""
                  }`}
                  type="button"
                  onClick={() => loadItemDetail(item)}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <TypeBadge value={item.type} />
                        {item.status ? <StatusBadge value={item.status} /> : null}
                        {item.relatedNumber ? (
                          <span className="field-muted">{item.relatedNumber}</span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
                      <p className="field-muted mt-2 leading-6">{item.summary}</p>
                    </div>
                    <p className="field-muted">{formatDateTime(item.eventDate)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                    <span className="rounded-md border border-[#d9dee3] px-2 py-1 dark:border-[#2f3742]">
                      Actor: {item.actorName ?? "Not recorded"}
                    </span>
                    <span className="rounded-md border border-[#d9dee3] px-2 py-1 dark:border-[#2f3742]">
                      Attachments: {item.attachmentCount}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="field-panel">
            <h2 className="field-section-title">Details</h2>
            {loadingDetail ? (
              <p className="field-muted mt-4">Loading detail...</p>
            ) : null}
            {!loadingDetail && !selectedDetail ? (
              <p className="field-muted mt-4">
                Select a service, upgrade, or ticket item to view full details.
              </p>
            ) : null}
            {!loadingDetail && selectedDetail?.kind === "MACHINE_LOG" ? (
              <MachineLogDetailPanel machine={machine} machineId={machineId} detail={selectedDetail.data} />
            ) : null}
            {!loadingDetail && selectedDetail?.kind === "TICKET" ? (
              <TicketDetailPanel detail={selectedDetail.data} />
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}

function MachineLogDetailPanel({
  machine,
  machineId,
  detail
}: {
  machine: MachineDetail | null;
  machineId: string;
  detail: MachineLogDetail;
}) {
  const [linkStatus, setLinkStatus] = useState<string | null>(null);
  const [acknowledgementUrl, setAcknowledgementUrl] = useState<string | null>(null);
  const [acknowledgementMessage, setAcknowledgementMessage] = useState<string | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);

  async function createAcknowledgementLink() {
    setCreatingLink(true);
    setLinkStatus(null);

    try {
      const response = await apiRequest<{
        data: {
          acknowledgementUrl: string;
        };
      }>(`/api/machines/${machineId}/logs/${detail.id}/acknowledgement-link`, {
        method: "POST",
        body: JSON.stringify({})
      });

      const readyMessage = buildMachineLogAcknowledgementMessage({
        acknowledgementUrl: response.data.acknowledgementUrl,
        customerName: machine?.customer.name ?? "Not recorded",
        machineName: machine?.machineName ?? "Not recorded",
        model: machine?.model,
        serialNumber: machine?.serialNumber,
        location: machine?.location,
        activityType: activityTypeLabel(detail.activityType),
        title: detail.title,
        workDate: detail.workDate,
        workEndAt: detail.workEndAt,
        summary: detail.workSummary
      });

      setAcknowledgementUrl(response.data.acknowledgementUrl);
      setAcknowledgementMessage(readyMessage);
      await navigator.clipboard.writeText(readyMessage);
      setLinkStatus("Acknowledgement message copied.");
    } catch (err) {
      setLinkStatus(err instanceof Error ? err.message : "Unable to create acknowledgement link.");
    } finally {
      setCreatingLink(false);
    }
  }

  async function copyAcknowledgementMessage() {
    if (!acknowledgementMessage) return;

    try {
      await navigator.clipboard.writeText(acknowledgementMessage);
      setLinkStatus("Acknowledgement message copied.");
    } catch {
      setLinkStatus("Copy failed. Select and copy the message manually.");
    }
  }

  async function copyAcknowledgementUrl() {
    if (!acknowledgementUrl) return;

    try {
      await navigator.clipboard.writeText(acknowledgementUrl);
      setLinkStatus("Acknowledgement link copied.");
    } catch {
      setLinkStatus("Copy failed. Select and copy the link manually.");
    }
  }

  return (
    <div className="mt-4 grid gap-4">
      <InfoLine label="Activity Type" value={activityTypeLabel(detail.activityType)} />
      <InfoLine label="Work Time" value={formatDateTime(detail.workDate)} />
      <InfoLine label="End Time" value={detail.workEndAt ? formatDateTime(detail.workEndAt) : "Not recorded"} />
      <InfoLine label="Title" value={detail.title} />
      <InfoLine label="Summary" value={detail.workSummary} />
      <InfoLine label="Parts Used" value={detail.partsUsed || "None recorded"} />
      {detail.activityType === "UPGRADE" ? (
        <>
          <InfoLine label="Upgrade Version" value={detail.upgradeVersion || "None recorded"} />
          <InfoLine label="Upgrade Description" value={detail.upgradeDescription || "None recorded"} />
        </>
      ) : null}
      {detail.activityType === "MACHINE_MAINTENANCE" ? (
        <InfoLine label="Next Machine Maintenance Override" value={detail.nextServiceDueOverrideAt ? formatDate(detail.nextServiceDueOverrideAt) : "None"} />
      ) : null}
      <div className="field-panel-subtle">
        <p className="text-sm font-semibold">Logged By</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <InfoLine label="Name" value={detail.loggedByRequesterName ?? detail.loggedByUser?.name ?? detail.requesterConfirmedName ?? "Not recorded"} />
          <InfoLine label="Contact Number" value={detail.requesterContactPhone || "Not recorded"} />
          <InfoLine label="Email" value={detail.requesterContactEmail || "Not recorded"} />
        </div>
      </div>
      <InfoLine label="User Signature Required" value={detail.requesterAcknowledgementRequired ? "Yes" : "No"} />
      <div className="field-panel-subtle">
        <p className="text-sm font-semibold">Customer Notification</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <InfoLine label="Notify Customer" value={detail.notifyCustomer ? "Yes" : "No"} />
          <InfoLine label="Notification Logged At" value={detail.notifiedAt ? formatDateTime(detail.notifiedAt) : "Not sent"} />
          <InfoLine label="Notify Name" value={detail.notifyRecipientName || "Not recorded"} />
          <InfoLine label="Notify Phone" value={detail.notifyRecipientPhone || "Not recorded"} />
          <InfoLine label="Notify Email" value={detail.notifyRecipientEmail || "Not recorded"} />
          <InfoLine label="Message Note" value={detail.notifyMessage || "None"} />
        </div>
      </div>
      <div className="field-panel-subtle">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Acknowledgement</p>
            <p className="field-muted mt-1">
              {detail.acknowledgement?.response
                ? `Signed by ${detail.acknowledgement.requesterName ?? "user"}${detail.acknowledgement.acknowledgedAt ? ` on ${formatDateTime(detail.acknowledgement.acknowledgedAt)}` : ""}`
                : "No signature submitted yet."}
            </p>
          </div>
          {!detail.acknowledgement?.response ? (
            <button
              className="field-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={creatingLink}
              onClick={createAcknowledgementLink}
            >
              {creatingLink ? "Creating..." : "Create Acknowledgement Message"}
            </button>
          ) : null}
        </div>
        {acknowledgementMessage ? (
          <div className="mt-3 rounded-md border border-[#d9dee3] bg-white p-3 text-sm dark:border-[#2f3742] dark:bg-[#0f1115]">
            <p className="field-meta-label">Ready Message</p>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-neutral-800 dark:text-neutral-100">
              {acknowledgementMessage}
            </pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="field-button-secondary min-h-10" type="button" onClick={copyAcknowledgementMessage}>
                Copy Message
              </button>
              <button className="field-button-secondary min-h-10" type="button" onClick={copyAcknowledgementUrl}>
                Copy Link
              </button>
            </div>
          </div>
        ) : null}
        {detail.acknowledgement?.response ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <InfoLine label="Contact Number" value={detail.acknowledgement.requesterPhone || "Not recorded"} />
            <InfoLine label="Email" value={detail.acknowledgement.requesterEmail || "Not recorded"} />
            {detail.acknowledgement.requesterComment ? (
              <div className="sm:col-span-2">
                <InfoLine label="Comment" value={detail.acknowledgement.requesterComment} />
              </div>
            ) : null}
          </div>
        ) : null}
        {linkStatus ? <p className="field-muted mt-3">{linkStatus}</p> : null}
      </div>
      {detail.ticket ? (
        <div className="field-panel-subtle">
          <p className="text-sm font-semibold">Related Ticket</p>
          <InfoLine label="Ticket" value={`${detail.ticket.ticketNumber} / ${detail.ticket.status}`} />
          <InfoLine label="Issue" value={detail.ticket.issueTitle} />
        </div>
      ) : null}
      {detail.serviceReport ? (
        <div className="field-panel-subtle">
          <p className="text-sm font-semibold">Related Service Report</p>
          <InfoLine label="Diagnosis" value={detail.serviceReport.diagnosis} />
          <InfoLine label="Action" value={detail.serviceReport.actionTaken} />
          <InfoLine label="Result" value={detail.serviceReport.resolutionStatus} />
        </div>
      ) : null}
      <div className="field-panel-subtle">
        <p className="text-sm font-semibold">Attachments ({detail.attachments.length})</p>
        {detail.attachments.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {detail.attachments.map((attachment) => (
              <a
                key={attachment.id}
                className="field-panel-subtle text-sm transition hover:border-[#155e75] dark:hover:border-[#22d3ee]"
                href={attachmentDownloadUrl(attachment.id)}
              >
                <span className="font-medium">{attachment.originalFileName}</span>
                <span className="mt-1 block text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                  {formatBytes(attachment.fileSizeBytes)} / {attachment.uploadedByUser?.name ?? attachment.uploadedByRequesterName ?? "Unknown"} / {formatDate(attachment.createdAt)}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="field-muted mt-2">No attachments uploaded.</p>
        )}
      </div>
    </div>
  );
}

function TicketDetailPanel({ detail }: { detail: TicketDetail }) {
  const latestReport = detail.serviceReports[0];

  return (
    <div className="mt-4 grid gap-4">
      <InfoLine label="Ticket" value={detail.ticketNumber} />
      <InfoLine label="Status" value={detail.status} />
      <InfoLine label="Priority" value={detail.priority} />
      <InfoLine label="Issue" value={detail.issueTitle} />
      <InfoLine label="Description" value={detail.issueDescription} />
      <InfoLine label="Requester" value={detail.requesterName} />
      <InfoLine label="Contact Number" value={detail.requesterPhone || "Not provided"} />
      <InfoLine label="Email" value={detail.requesterEmail || "Not provided"} />
      {latestReport ? (
        <div className="field-panel-subtle">
          <p className="text-sm font-semibold">Latest Service Report</p>
          <InfoLine label="Diagnosis" value={latestReport.diagnosis} />
          <InfoLine label="Action" value={latestReport.actionTaken} />
          <InfoLine label="Result" value={latestReport.resolutionStatus} />
        </div>
      ) : null}
      {detail.acknowledgement ? (
        <div className="field-panel-subtle">
          <p className="text-sm font-semibold">Acknowledgement</p>
          <InfoLine label="Response" value={detail.acknowledgement.response || "Pending"} />
          <InfoLine label="Requester" value={detail.acknowledgement.requesterName || "Not recorded"} />
        </div>
      ) : null}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-panel-subtle">
      <p className="field-meta-label">{label}</p>
      <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">{value}</p>
    </div>
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

function TypeBadge({ value }: { value: string }) {
  return (
    <span className={`status-badge ${value === "MACHINE_LOG" ? "status-cyan" : "status-blue"}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

type ActivityType =
  | "CORRECTIVE_SERVICE"
  | "MACHINE_MAINTENANCE"
  | "COMPONENT_REPLACEMENT"
  | "INSPECTION_DIAGNOSIS"
  | "UPGRADE"
  | "OTHER";

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

function StatusBadge({ value }: { value: string }) {
  return (
    <span className="status-badge status-neutral">
      {value}
    </span>
  );
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

function formatDateTime(value: string) {
  return formatDate(value);
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}
