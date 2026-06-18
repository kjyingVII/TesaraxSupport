"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AdminMenu } from "../../../components/admin-menu";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiRequest } from "../../../lib/api";

type AuditLog = {
  id: string;
  actorUserId: string | null;
  actorRequesterName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  beforeData: unknown;
  afterData: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actorUser: {
    name: string;
    email: string;
    role: string;
  } | null;
};

type AuditLogListResponse = {
  data: AuditLog[];
  meta: {
    total: number;
  };
};

type AuditFilterState = {
  action: string;
  entityType: string;
  entityId: string;
  requesterName: string;
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadLogs();
  }, []);

  async function loadLogs(overrides?: Partial<AuditFilterState>) {
    setLoading(true);
    setError(null);

    const filters = {
      action,
      entityType,
      entityId,
      requesterName,
      ...overrides
    };
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (filters.action.trim()) params.set("action", filters.action.trim());
    if (filters.entityType.trim()) params.set("entityType", filters.entityType.trim());
    if (filters.entityId.trim()) params.set("entityId", filters.entityId.trim());
    if (filters.requesterName.trim()) params.set("actorRequesterName", filters.requesterName.trim());

    try {
      const response = await apiRequest<AuditLogListResponse>(`/api/admin/audit-logs?${params.toString()}`);
      setLogs(response.data);
      setTotal(response.meta.total);
      setSelectedLog((current) => current ?? response.data[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSelectedLog(null);
    void loadLogs();
  }

  function applyQuickFilter(filters: AuditFilterState) {
    setAction(filters.action);
    setEntityType(filters.entityType);
    setEntityId(filters.entityId);
    setRequesterName(filters.requesterName);
    setSelectedLog(null);
    void loadLogs(filters);
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
              <span>Audit Logs</span>
            </nav>
            <h1 className="field-title">Audit Logs</h1>
          </div>
          <ThemeToggle />
        </header>

        <AdminMenu />

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,0.75fr)]">
          <section className="field-panel p-0">
            <div className="border-b border-[#d9dee3] p-4 dark:border-[#2f3742]">
              <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.15fr_0.8fr_1fr_1fr_auto]" onSubmit={applyFilters}>
                <select className="field-input mt-0 h-11" value={action} onChange={(event) => setAction(event.target.value)}>
                  <option value="">All actions</option>
                  <option value="PUBLIC_MACHINE_ACCESS_GRANTED">Machine access granted</option>
                  <option value="PUBLIC_MACHINE_PORTAL_VIEWED">Machine portal viewed</option>
                  <option value="CREATE_TICKET">Ticket created</option>
                  <option value="UPDATE_TICKET_STATUS">Ticket status updated</option>
                  <option value="ASSIGN_TICKET">Ticket assigned</option>
                  <option value="UPDATE_MACHINE">Machine updated</option>
                  <option value="UPDATE_CUSTOMER">Customer updated</option>
                  <option value="UPDATE_USER">User updated</option>
                </select>
                <select className="field-input mt-0 h-11" value={entityType} onChange={(event) => setEntityType(event.target.value)}>
                  <option value="">All entities</option>
                  <option value="Customer">Customer</option>
                  <option value="Machine">Machine</option>
                  <option value="SystemSetting">Settings</option>
                  <option value="Ticket">Ticket</option>
                  <option value="User">User</option>
                </select>
                <input className="field-input mt-0 h-11" value={entityId} placeholder="Entity ID" onChange={(event) => setEntityId(event.target.value)} />
                <input className="field-input mt-0 h-11" value={requesterName} placeholder="Requester name" onChange={(event) => setRequesterName(event.target.value)} />
                <button className="field-button-secondary" type="submit">Search</button>
              </form>
              <div className="mt-3 flex flex-wrap gap-2">
                <QuickFilter label="Security Activity" onClick={() => applyQuickFilter({ action: "PUBLIC_MACHINE", entityType: "Machine", entityId: "", requesterName: "" })} />
                <QuickFilter label="Machine Views" onClick={() => applyQuickFilter({ action: "PUBLIC_MACHINE_PORTAL_VIEWED", entityType: "Machine", entityId: "", requesterName: "" })} />
                <QuickFilter label="Access Granted" onClick={() => applyQuickFilter({ action: "PUBLIC_MACHINE_ACCESS_GRANTED", entityType: "Machine", entityId: "", requesterName: "" })} />
              </div>
              <p className="field-muted mt-3">{total} audit records found</p>
            </div>

            {error ? <div className="field-alert-error m-4">{error}</div> : null}

            <div className="divide-y divide-[#d9dee3] dark:divide-[#2f3742]">
              {loading ? <p className="field-muted p-4">Loading...</p> : null}
              {!loading && logs.length === 0 ? <p className="field-muted p-4">No audit records found.</p> : null}
              {logs.map((log) => (
                <button key={log.id} className={`w-full p-4 text-left transition hover:bg-cyan-50/60 dark:hover:bg-[#1f242d] ${selectedLog?.id === log.id ? "bg-cyan-50 dark:bg-[#1f242d]" : ""}`} type="button" onClick={() => setSelectedLog(log)}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{formatAction(log.action)}</p>
                      <p className="field-muted mt-1">{log.entityType} / {log.entityId}</p>
                      <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">{log.actorUser?.name ?? log.actorRequesterName ?? "System"}</p>
                      <AuditSummary log={log} />
                    </div>
                    <span className="text-xs text-[#5f6368] dark:text-[#a8b0ba]">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="field-panel">
            <h2 className="field-section-title">Record Detail</h2>
            {selectedLog ? (
              <div className="mt-4 grid gap-4">
                <Detail label="Action" value={selectedLog.action} />
                <Detail label="Entity" value={`${selectedLog.entityType} / ${selectedLog.entityId}`} />
                <Detail label="Actor" value={selectedLog.actorUser ? `${selectedLog.actorUser.name} (${selectedLog.actorUser.email})` : selectedLog.actorRequesterName ?? "System"} />
                <Detail label="Requester Phone" value={String(getAfterData(selectedLog).requesterPhone ?? "None")} />
                <Detail label="Requester Email" value={String(getAfterData(selectedLog).requesterEmail ?? "None")} />
                <Detail label="IP Address" value={selectedLog.ipAddress ?? "None"} />
                <Detail label="User Agent" value={selectedLog.userAgent ?? "None"} />
                <Detail label="Date" value={new Date(selectedLog.createdAt).toLocaleString()} />
                <JsonBlock title="Before" value={selectedLog.beforeData} />
                <JsonBlock title="After" value={selectedLog.afterData} />
              </div>
            ) : (
              <p className="field-muted mt-4">Select an audit record.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="field-meta-label">{label}</p>
      <p className="mt-1 break-all text-sm font-medium">{value}</p>
    </div>
  );
}

function QuickFilter({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="field-button-secondary min-h-9 px-3 text-xs"
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function AuditSummary({ log }: { log: AuditLog }) {
  const data = getAfterData(log);
  const requesterPhone = typeof data.requesterPhone === "string" ? data.requesterPhone : null;
  const requesterEmail = typeof data.requesterEmail === "string" ? data.requesterEmail : null;
  const activeTicketCount = typeof data.activeTicketCount === "number" ? data.activeTicketCount : null;
  const closedTicketCount = typeof data.closedTicketCount === "number" ? data.closedTicketCount : null;

  if (!requesterPhone && !requesterEmail && !log.ipAddress && activeTicketCount === null && closedTicketCount === null) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#5f6368] dark:text-[#a8b0ba]">
      {requesterPhone ? <span className="rounded-md bg-cyan-50 px-2 py-1 dark:bg-[#0f1115]">Phone: {requesterPhone}</span> : null}
      {requesterEmail ? <span className="rounded-md bg-cyan-50 px-2 py-1 dark:bg-[#0f1115]">Email: {requesterEmail}</span> : null}
      {log.ipAddress ? <span className="rounded-md bg-cyan-50 px-2 py-1 dark:bg-[#0f1115]">IP: {log.ipAddress}</span> : null}
      {activeTicketCount !== null ? <span className="rounded-md bg-cyan-50 px-2 py-1 dark:bg-[#0f1115]">Active: {activeTicketCount}</span> : null}
      {closedTicketCount !== null ? <span className="rounded-md bg-cyan-50 px-2 py-1 dark:bg-[#0f1115]">Closed: {closedTicketCount}</span> : null}
    </div>
  );
}

function getAfterData(log: AuditLog) {
  if (!log.afterData || typeof log.afterData !== "object" || Array.isArray(log.afterData)) {
    return {} as Record<string, unknown>;
  }

  return log.afterData as Record<string, unknown>;
}

function formatAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="field-meta-label">{title}</p>
      <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-[#eef3f6] p-3 text-xs text-neutral-800 dark:bg-[#0f1115] dark:text-neutral-100">
        {value === null || value === undefined ? "None" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
