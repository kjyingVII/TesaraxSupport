"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AdminMenu } from "../../../components/admin-menu";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiRequest } from "../../../lib/api";

type NotificationLog = {
  id: string;
  relatedType: string | null;
  relatedId: string | null;
  channel: string;
  recipientName: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  subject: string | null;
  messageSummary: string | null;
  status: string;
  providerMessageId: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  latestWebhookEvent?: WhatsAppWebhookEvent | null;
  webhookEvents?: WhatsAppWebhookEvent[];
};

type WhatsAppWebhookEvent = {
  id: string;
  eventType: string;
  providerMessageId: string | null;
  senderPhone: string | null;
  status: string | null;
  receivedAt: string;
  payload: unknown;
};

type NotificationLogListResponse = {
  data: NotificationLog[];
  meta: {
    total: number;
  };
};

type ReminderStaff = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  openTaskCount: number;
  nextTaskTitle: string | null;
  nextTaskStartAt: string | null;
};

type ReminderStaffResponse = {
  data: ReminderStaff[];
};

type NotificationFilterState = {
  channel: string;
  status: string;
  relatedType: string;
  search: string;
};

export function NotificationLogsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [staff, setStaff] = useState<ReminderStaff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const [relatedType, setRelatedType] = useState("");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadLogs();
    void loadStaff();
  }, []);

  async function loadLogs(overrides?: Partial<NotificationFilterState>) {
    setLoading(true);
    setError(null);

    const filters = {
      channel,
      status,
      relatedType,
      search,
      ...overrides
    };
    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (filters.channel.trim()) params.set("channel", filters.channel.trim());
    if (filters.status.trim()) params.set("status", filters.status.trim());
    if (filters.relatedType.trim()) params.set("relatedType", filters.relatedType.trim());
    if (filters.search.trim()) params.set("search", filters.search.trim());

    try {
      const response = await apiRequest<NotificationLogListResponse>(`/api/admin/notification-logs?${params.toString()}`);
      setLogs(response.data);
      setTotal(response.meta.total);
      setSelectedLog((current) => current ?? response.data[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load notification logs.");
    } finally {
      setLoading(false);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSelectedLog(null);
    void loadLogs();
  }

  function applyQuickFilter(filters: NotificationFilterState) {
    setChannel(filters.channel);
    setStatus(filters.status);
    setRelatedType(filters.relatedType);
    setSearch(filters.search);
    setSelectedLog(null);
    void loadLogs(filters);
  }

  async function loadStaff() {
    try {
      const response = await apiRequest<ReminderStaffResponse>("/api/admin/task-reminders/staff");
      setStaff(response.data);
      setSelectedStaffId((current) => current || response.data.find((item) => item.openTaskCount > 0)?.id || response.data[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load staff reminder targets.");
    }
  }

  async function sendReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStaffId) return;

    setSendingReminder(true);
    setError(null);
    setReminderMessage(null);

    try {
      const response = await apiRequest<NotificationLog>(`/api/admin/task-reminders/staff/${selectedStaffId}/send`, {
        method: "POST",
        body: JSON.stringify({})
      });
      setReminderMessage(`Reminder processed with status ${response.status}.`);
      setSelectedLog(response);
      await loadLogs();
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send task reminder.");
    } finally {
      setSendingReminder(false);
    }
  }

  const selectedStaff = staff.find((item) => item.id === selectedStaffId) ?? null;

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
              <span>Notifications</span>
            </nav>
            <h1 className="field-title">Notification Logs</h1>
          </div>
          <ThemeToggle />
        </header>

        <AdminMenu />

        <section className="field-panel mt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="field-section-title">Manual Task Reminder</h2>
              <p className="field-muted mt-1">
                Send the approved daily WhatsApp reminder to one staff member based on their assigned open tasks.
              </p>
            </div>
            <form className="grid gap-3 md:min-w-[520px] md:grid-cols-[minmax(220px,1fr)_auto]" onSubmit={sendReminder}>
              <select
                className="field-input mt-0 h-11"
                value={selectedStaffId}
                onChange={(event) => setSelectedStaffId(event.target.value)}
              >
                {staff.length === 0 ? <option value="">No staff found</option> : null}
                {staff.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} / {item.role} / {item.openTaskCount} open task(s)
                  </option>
                ))}
              </select>
              <button
                className="field-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                type="submit"
                disabled={sendingReminder || !selectedStaffId}
              >
                {sendingReminder ? "Sending..." : "Send Reminder"}
              </button>
            </form>
          </div>
          {selectedStaff ? (
            <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
              <MiniDetail label="Phone" value={selectedStaff.phone ?? "No phone number"} />
              <MiniDetail label="Open Tasks" value={String(selectedStaff.openTaskCount)} />
              <MiniDetail label="Next Task" value={selectedStaff.nextTaskTitle ?? "No open task"} />
            </div>
          ) : null}
          {reminderMessage ? <div className="field-alert-success mt-4 p-3 text-sm">{reminderMessage}</div> : null}
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,0.75fr)]">
          <section className="field-panel p-0">
            <div className="border-b border-[#d9dee3] p-4 dark:border-[#2f3742]">
              <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[0.85fr_0.85fr_0.9fr_1.3fr_auto]" onSubmit={applyFilters}>
                <select className="field-input mt-0 h-11" value={channel} onChange={(event) => setChannel(event.target.value)}>
                  <option value="">All channels</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="SYSTEM">System</option>
                </select>
                <select className="field-input mt-0 h-11" value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">All statuses</option>
                  <option value="SKIPPED">Skipped</option>
                  <option value="PENDING">Pending</option>
                  <option value="SENT">Sent</option>
                  <option value="FAILED">Failed</option>
                </select>
                <select className="field-input mt-0 h-11" value={relatedType} onChange={(event) => setRelatedType(event.target.value)}>
                  <option value="">All events</option>
                  <option value="Ticket">Ticket</option>
                  <option value="ServiceReport">Service Report</option>
                  <option value="MachineLog">Machine Log</option>
                  <option value="TaskDailyReminder">Task Reminder</option>
                </select>
                <input
                  className="field-input mt-0 h-11"
                  value={search}
                  placeholder="Search recipient, phone, message"
                  onChange={(event) => setSearch(event.target.value)}
                />
                <button className="field-button-secondary" type="submit">
                  Search
                </button>
              </form>
              <div className="mt-3 flex flex-wrap gap-2">
                <QuickFilter label="WhatsApp Skipped" onClick={() => applyQuickFilter({ channel: "WHATSAPP", status: "SKIPPED", relatedType: "", search: "" })} />
                <QuickFilter label="Ticket Events" onClick={() => applyQuickFilter({ channel: "", status: "", relatedType: "Ticket", search: "" })} />
                <QuickFilter label="Service Reports" onClick={() => applyQuickFilter({ channel: "", status: "", relatedType: "ServiceReport", search: "" })} />
              </div>
              <p className="field-muted mt-3">{total} notification records found</p>
            </div>

            {error ? <div className="field-alert-error m-4">{error}</div> : null}

            <div className="divide-y divide-[#d9dee3] dark:divide-[#2f3742]">
              {loading ? <p className="field-muted p-4">Loading...</p> : null}
              {!loading && logs.length === 0 ? <p className="field-muted p-4">No notification records found.</p> : null}
              {logs.map((log) => (
                <button
                  key={log.id}
                  className={`w-full p-4 text-left transition hover:bg-cyan-50/60 dark:hover:bg-[#1f242d] ${
                    selectedLog?.id === log.id ? "bg-cyan-50 dark:bg-[#1f242d]" : ""
                  }`}
                  type="button"
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={log.status} />
                        <p className="text-sm font-semibold">{log.subject ?? "Notification"}</p>
                      </div>
                      <p className="field-muted mt-1">
                        {log.channel} / {log.relatedType ?? "General"} / {log.relatedId ?? "No related record"}
                      </p>
                      <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                        {log.recipientName ?? "Unnamed recipient"} {log.recipientPhone ? `/ ${log.recipientPhone}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                        Webhook: {webhookStatusLabel(log.latestWebhookEvent ?? null)}
                      </p>
                      {log.errorMessage ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{log.errorMessage}</p> : null}
                    </div>
                    <span className="text-xs text-[#5f6368] dark:text-[#a8b0ba]">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="field-panel">
            <h2 className="field-section-title">Notification Detail</h2>
            {selectedLog ? (
              <div className="mt-4 grid gap-4">
                <Detail label="Status" value={selectedLog.status} />
                <Detail label="Channel" value={selectedLog.channel} />
                <Detail label="Recipient" value={selectedLog.recipientName ?? "Unnamed recipient"} />
                <Detail label="Phone" value={selectedLog.recipientPhone ?? "None"} />
                <Detail label="Email" value={selectedLog.recipientEmail ?? "None"} />
                <Detail label="Related Record" value={`${selectedLog.relatedType ?? "General"} / ${selectedLog.relatedId ?? "None"}`} />
                <Detail label="Provider Message ID" value={selectedLog.providerMessageId ?? "None"} />
                <Detail label="Latest Webhook Status" value={webhookStatusLabel(selectedLog.latestWebhookEvent ?? null)} />
                <Detail label="Created" value={new Date(selectedLog.createdAt).toLocaleString()} />
                <Detail label="Sent" value={selectedLog.sentAt ? new Date(selectedLog.sentAt).toLocaleString() : "Not sent"} />
                <MessageBlock title="Subject" value={selectedLog.subject ?? "None"} />
                <MessageBlock title="Message" value={selectedLog.messageSummary ?? "None"} />
                <MessageBlock title="Error" value={selectedLog.errorMessage ?? "None"} />
                <WebhookEventsBlock events={selectedLog.webhookEvents ?? []} />
              </div>
            ) : (
              <p className="field-muted mt-4">Select a notification record.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function MiniDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-panel-subtle">
      <p className="field-meta-label">{label}</p>
      <p className="mt-1 break-words text-neutral-800 dark:text-neutral-100">{value}</p>
    </div>
  );
}

function WebhookEventsBlock({ events }: { events: WhatsAppWebhookEvent[] }) {
  return (
    <div>
      <p className="field-meta-label">Webhook Delivery History</p>
      {events.length === 0 ? (
        <p className="field-muted mt-2 rounded-md bg-[#eef3f6] p-3 text-xs dark:bg-[#0f1115]">
          No webhook callbacks received for this provider message ID yet.
        </p>
      ) : (
        <div className="mt-2 grid gap-2">
          {events.map((event) => (
            <details key={event.id} className="rounded-md border border-[#d9dee3] bg-[#eef3f6] p-3 text-xs dark:border-[#2f3742] dark:bg-[#0f1115]">
              <summary className="cursor-pointer font-semibold">
                {event.eventType} / {event.status ?? "No status"} / {new Date(event.receivedAt).toLocaleString()}
              </summary>
              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-all text-neutral-800 dark:text-neutral-100">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function webhookStatusLabel(event: WhatsAppWebhookEvent | null) {
  if (!event) return "No callback yet";
  return `${event.status ?? event.eventType} at ${new Date(event.receivedAt).toLocaleString()}`;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="field-meta-label">{label}</p>
      <p className="mt-1 break-all text-sm font-medium">{value}</p>
    </div>
  );
}

function MessageBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="field-meta-label">{title}</p>
      <pre className="mt-2 whitespace-pre-wrap rounded-md bg-[#eef3f6] p-3 text-xs text-neutral-800 dark:bg-[#0f1115] dark:text-neutral-100">{value}</pre>
    </div>
  );
}

function QuickFilter({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="field-button-secondary min-h-9 px-3 text-xs" type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    SENT: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    FAILED: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200",
    SKIPPED: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
    PENDING: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-200"
  };

  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${styles[status] ?? styles.PENDING}`}>
      {status}
    </span>
  );
}
