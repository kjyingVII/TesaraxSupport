"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiBaseUrl, apiRequest } from "../../../lib/api";
import { clearMachineAccessSession, getMachineAccessSession } from "../../../lib/machine-access";

type TicketSummary = {
  id: string;
  ticketNumber: string;
  issueTitle: string;
  issueCategory: string;
  priority: string;
  status: string;
  requesterName: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

type LogSummary = {
  id: string;
  logType: "SERVICE" | "UPGRADE";
  workDate: string;
  workSummary: string;
  partsUsed: string | null;
  upgradeVersion: string | null;
  upgradeDescription: string | null;
  requesterConfirmedName: string | null;
  createdAt: string;
};

type MachineDocument = {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSizeBytes: number;
  createdAt: string;
};

type PortalResponse = {
  data: {
    machine: {
      publicId: string;
      machineName: string;
      model: string;
      serialNumber: string;
      location: string;
      customerName: string;
      serviceReminderIntervalDays: number;
      lastServiceAt: string | null;
      nextServiceDueAt: string | null;
      lastUpgradeAt: string | null;
      isActive: boolean;
    };
    tickets: {
      active: TicketSummary[];
      closed: TicketSummary[];
    };
    logs: {
      service: LogSummary[];
      upgrade: LogSummary[];
    };
    documents: MachineDocument[];
  };
};

export function MachinePortalPage({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [portal, setPortal] = useState<PortalResponse["data"] | null>(null);
  const [requesterName, setRequesterName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPortal() {
      const session = getMachineAccessSession(publicId);
      if (!session) {
        router.replace(`/m/${publicId}/access`);
        return;
      }

      setRequesterName(session.requesterName);

      try {
        const response = await apiRequest<PortalResponse>(`/api/public/machines/${publicId}/portal`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`
          }
        });
        if (!mounted) return;
        setPortal(response.data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load machine page.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPortal();

    return () => {
      mounted = false;
    };
  }, [publicId, router]);

  function leaveMachine() {
    clearMachineAccessSession(publicId);
    router.push(`/m/${publicId}/access`);
  }

  async function downloadDocument(document: MachineDocument) {
    const session = getMachineAccessSession(publicId);
    if (!session) {
      router.replace(`/m/${publicId}/access`);
      return;
    }

    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/public/machines/${publicId}/documents/${document.id}/download`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? payload?.error?.message ?? "Unable to download document.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.originalFileName;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download document.");
    }
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-5xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">
              {requesterName ? `Welcome, ${requesterName}` : "Machine Support"}
            </p>
            <h1 className="field-title">Machine Page</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="field-button-secondary"
              type="button"
              onClick={leaveMachine}
            >
              Leave
            </button>
            <ThemeToggle />
          </div>
        </header>

        {loading ? (
          <section className="field-panel mt-6">
            <p className="field-muted">Loading machine details...</p>
          </section>
        ) : null}

        {error ? (
          <section className="field-alert-error mt-6">
            <p>{error}</p>
            <button className="mt-4 min-h-10 rounded-md bg-red-900 px-4 text-sm font-medium text-white dark:bg-red-100 dark:text-red-950" type="button" onClick={leaveMachine}>
              Re-enter Access
            </button>
          </section>
        ) : null}

        {portal ? (
          <>
            <section className="field-panel mt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="field-eyebrow">{portal.machine.customerName}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{portal.machine.machineName}</h2>
                  <p className="field-muted mt-2">
                    {portal.machine.model} / {portal.machine.serialNumber}
                  </p>
                  <p className="field-muted mt-1">{portal.machine.location}</p>
                </div>
                <Link
                  className="field-button-primary w-full sm:w-auto"
                  href={`/request/${publicId}`}
                >
                  Submit New Request
                </Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <InfoBox label="Next Service Due" value={portal.machine.nextServiceDueAt ? formatDate(portal.machine.nextServiceDueAt) : "Not set"} />
                <InfoBox label="Last Service" value={portal.machine.lastServiceAt ? formatDate(portal.machine.lastServiceAt) : "No service recorded"} />
                <InfoBox label="Reminder Cycle" value={`${portal.machine.serviceReminderIntervalDays} days`} />
              </div>
            </section>

            <section className="mt-6 grid gap-5 lg:grid-cols-2">
              <ListPanel title="Machine Documents" empty="No manuals uploaded for this machine yet.">
                {portal.documents.map((document) => (
                  <DocumentRow key={document.id} document={document} onDownload={downloadDocument} />
                ))}
              </ListPanel>
              <ListPanel title="Active Tickets" empty="No active tickets.">
                {portal.tickets.active.map((ticket) => <TicketRow key={ticket.id} publicId={publicId} ticket={ticket} />)}
              </ListPanel>
              <ListPanel title="Closed Tickets" empty="No closed tickets.">
                {portal.tickets.closed.map((ticket) => <TicketRow key={ticket.id} publicId={publicId} ticket={ticket} />)}
              </ListPanel>
              <ListPanel title="Service Log" empty="No service logs.">
                {portal.logs.service.map((log) => <LogRow key={log.id} log={log} />)}
              </ListPanel>
              <ListPanel title="Upgrade Log" empty="No upgrade logs.">
                {portal.logs.upgrade.map((log) => <LogRow key={log.id} log={log} />)}
              </ListPanel>
            </section>
          </>
        ) : null}
      </section>
    </main>
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

function ListPanel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="field-panel">
      <h2 className="field-section-title">{title}</h2>
      <div className="mt-4 grid gap-3">
        {children.length > 0 ? children : <p className="field-muted">{empty}</p>}
      </div>
    </section>
  );
}

function TicketRow({ publicId, ticket }: { publicId: string; ticket: TicketSummary }) {
  return (
    <Link className="block rounded-md border border-[#d9dee3] bg-[#fbfcfd] p-3 text-sm transition hover:border-[#155e75] hover:bg-white dark:border-[#2f3742] dark:bg-[#1f242d] dark:hover:border-[#22d3ee]" href={`/m/${publicId}/tickets/${ticket.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{ticket.ticketNumber}</span>
        <span className={`status-badge ${statusTone(ticket.status)}`}>{ticket.status.replaceAll("_", " ")}</span>
      </div>
      <p className="mt-2 font-medium">{ticket.issueTitle}</p>
      <p className="field-muted mt-1">{ticket.issueCategory.replaceAll("_", " ")} / {ticket.priority.replaceAll("_", " ")}</p>
      <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">Created {formatDateTime(ticket.createdAt)}</p>
    </Link>
  );
}

function LogRow({ log }: { log: LogSummary }) {
  return (
    <article className="field-panel-subtle text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{formatDate(log.workDate)}</span>
        <span className={`status-badge ${log.logType === "SERVICE" ? "status-cyan" : "status-violet"}`}>{log.logType}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap leading-6 text-neutral-700 dark:text-neutral-200">{log.workSummary}</p>
      {log.partsUsed ? <p className="field-muted mt-2">Parts: {log.partsUsed}</p> : null}
      {log.upgradeVersion ? <p className="field-muted mt-2">Version: {log.upgradeVersion}</p> : null}
      {log.upgradeDescription ? <p className="field-muted mt-1">{log.upgradeDescription}</p> : null}
    </article>
  );
}

function DocumentRow({ document, onDownload }: { document: MachineDocument; onDownload: (document: MachineDocument) => void }) {
  return (
    <button
      className="block rounded-md border border-[#d9dee3] bg-[#fbfcfd] p-3 text-left text-sm transition hover:border-[#155e75] hover:bg-white dark:border-[#2f3742] dark:bg-[#1f242d] dark:hover:border-[#22d3ee]"
      type="button"
      onClick={() => onDownload(document)}
    >
      <span className="font-semibold">{document.originalFileName}</span>
      <span className="field-muted mt-1 block">
        {formatBytes(document.fileSizeBytes)} / Uploaded {formatDate(document.createdAt)}
      </span>
    </button>
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
      return "status-green";
    case "CLOSED":
      return "status-neutral";
    default:
      return "status-neutral";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
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
