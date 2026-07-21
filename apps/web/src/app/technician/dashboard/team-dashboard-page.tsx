"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminMenu } from "../../../components/admin-menu";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiRequest } from "../../../lib/api";

type DashboardScope = "team" | "mine";
type QuickFilter = "active" | "today" | "overdue" | "completed" | "all";
type RecordFilter = "all" | "tickets" | "tasks";
type SortField = "priorityDue" | "name" | "machine" | "start" | "end" | "status" | "priority";
type SortDirection = "asc" | "desc";

type DashboardItem = {
  id: string;
  recordType: "TICKET" | "TASK";
  title: string;
  subtitle: string | null;
  customerName: string;
  machineName: string;
  machineSerialNumber: string;
  startAt: string | null;
  dueAt: string | null;
  status: string;
  priority: string;
  visibility?: string;
  assignedTo: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  href: string;
  isOverdue: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DashboardActivityItem = {
  id: string;
  activityType: "MACHINE_LOG" | "TICKET_STATUS";
  title: string;
  description: string;
  customerName: string;
  machineName: string;
  machineSerialNumber: string;
  actorName: string | null;
  occurredAt: string;
  href: string;
  status: string | null;
};

type DashboardResponse = {
  data: {
    scope: DashboardScope;
    generatedAt: string;
    metrics: {
      total: number;
      active: number;
      today: number;
      overdue: number;
      completedThisWeek: number;
    };
    items: DashboardItem[];
    activity: DashboardActivityItem[];
  };
};

const quickFilters: Array<{ label: string; value: QuickFilter }> = [
  { label: "Active", value: "active" },
  { label: "Today", value: "today" },
  { label: "Overdue", value: "overdue" },
  { label: "Completed", value: "completed" },
  { label: "All", value: "all" }
];

export function TeamDashboardPage() {
  const [scope, setScope] = useState<DashboardScope>("team");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("active");
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("all");
  const [sortField, setSortField] = useState<SortField>("priorityDue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [search, setSearch] = useState("");
  const [dashboard, setDashboard] = useState<DashboardResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!dashboard) return [];

    const filtered = dashboard.items.filter((item) => {
      if (recordFilter === "tickets" && item.recordType !== "TICKET") return false;
      if (recordFilter === "tasks" && item.recordType !== "TASK") return false;
      if (quickFilter === "all") return true;
      const isTerminal = isTerminalStatus(item.status);
      if (quickFilter === "today") return !isTerminal && isToday(item.dueAt ?? item.startAt ?? item.updatedAt);
      if (quickFilter === "overdue") return !isTerminal && item.isOverdue;
      if (quickFilter === "completed") return Boolean(item.completedAt) || isTerminal;
      return !isTerminal;
    });

    return [...filtered].sort((a, b) => compareDashboardItems(a, b, sortField, sortDirection));
  }, [dashboard, quickFilter, recordFilter, sortDirection, sortField]);

  useEffect(() => {
    void loadDashboard(scope, search);
  }, [scope]);

  async function loadDashboard(nextScope = scope, nextSearch = search) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      scope: nextScope
    });
    if (nextSearch.trim()) params.set("search", nextSearch.trim());

    try {
      const response = await apiRequest<DashboardResponse>(`/api/dashboard/work?${params.toString()}`);
      setDashboard(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load team dashboard.");
    } finally {
      setLoading(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadDashboard(scope, search);
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-7xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">Team Work</p>
            <h1 className="field-title">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link className="field-button-primary min-h-10" href="/technician/tasks/new">
              New task
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <AdminMenu />

        <section className="mt-5 grid gap-4 md:grid-cols-5">
          <Metric label="Active Work" value={dashboard?.metrics.active ?? 0} />
          <Metric label="Due Today" value={dashboard?.metrics.today ?? 0} />
          <Metric label="Overdue" value={dashboard?.metrics.overdue ?? 0} tone="warning" />
          <Metric label="Completed This Week" value={dashboard?.metrics.completedThisWeek ?? 0} />
          <Metric label="Shown" value={filteredItems.length} />
        </section>

        <section className="field-panel mt-5">
          <div className="grid gap-4 xl:grid-cols-[auto_auto_1fr_auto] xl:items-end">
            <div>
              <span className="field-label">View</span>
              <div className="mt-1 inline-grid grid-cols-2 rounded-md border border-[#d9dee3] bg-[#f6f8fa] p-1 dark:border-[#2f3742] dark:bg-[#111821]">
                <button
                  className={scope === "team" ? "rounded bg-[#155e75] px-4 py-2 text-sm font-semibold text-white dark:bg-[#22d3ee] dark:text-[#082f49]" : "px-4 py-2 text-sm font-semibold text-[#5f6368] dark:text-[#a8b0ba]"}
                  type="button"
                  onClick={() => setScope("team")}
                >
                  Team View
                </button>
                <button
                  className={scope === "mine" ? "rounded bg-[#155e75] px-4 py-2 text-sm font-semibold text-white dark:bg-[#22d3ee] dark:text-[#082f49]" : "px-4 py-2 text-sm font-semibold text-[#5f6368] dark:text-[#a8b0ba]"}
                  type="button"
                  onClick={() => setScope("mine")}
                >
                  Only Me
                </button>
              </div>
            </div>

            <div>
              <span className="field-label">Display</span>
              <div className="mt-1 inline-grid grid-cols-3 rounded-md border border-[#d9dee3] bg-[#f6f8fa] p-1 dark:border-[#2f3742] dark:bg-[#111821]">
                {([
                  { label: "All", value: "all" },
                  { label: "Tickets", value: "tickets" },
                  { label: "Tasks", value: "tasks" }
                ] as Array<{ label: string; value: RecordFilter }>).map((option) => (
                  <button
                    key={option.value}
                    className={recordFilter === option.value ? "rounded bg-[#155e75] px-4 py-2 text-sm font-semibold text-white dark:bg-[#22d3ee] dark:text-[#082f49]" : "px-4 py-2 text-sm font-semibold text-[#5f6368] dark:text-[#a8b0ba]"}
                    type="button"
                    onClick={() => setRecordFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={submitSearch}>
              <label className="block">
                <span className="field-label">Search</span>
                <input
                  className="field-input h-11"
                  placeholder="Search task, ticket, machine, customer, serial no."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <button className="field-button-primary self-end" type="submit">
                Search
              </button>
            </form>

            <button className="field-button-secondary self-end" type="button" onClick={() => void loadDashboard(scope, search)}>
              Refresh
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {quickFilters.map((filter) => (
              <button
                key={filter.value}
                className={`min-h-9 rounded-md px-3 text-sm font-semibold transition ${
                  quickFilter === filter.value
                    ? "bg-[#155e75] text-white dark:bg-[#22d3ee] dark:text-[#082f49]"
                    : "border border-[#d9dee3] text-[#5f6368] hover:border-[#155e75] hover:text-[#155e75] dark:border-[#2f3742] dark:text-[#a8b0ba] dark:hover:border-[#22d3ee] dark:hover:text-[#67e8f9]"
                }`}
                type="button"
                onClick={() => setQuickFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        {error ? <div className="field-alert-error mt-5">{error}</div> : null}

        <section className="field-panel mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="field-section-title">Latest Activity</h2>
              <p className="field-muted mt-1 text-sm">Recent machine logs and ticket status events for quick team handover.</p>
            </div>
            <span className="field-muted text-sm">{dashboard?.activity.length ?? 0} updates</span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {loading ? <p className="field-muted">Loading activity...</p> : null}
            {!loading && dashboard?.activity.length === 0 ? <p className="field-muted">No recent activity found.</p> : null}
            {!loading ? dashboard?.activity.map((item) => <ActivityCard key={`${item.activityType}-${item.id}`} item={item} />) : null}
          </div>
        </section>

        <section className="field-panel mt-5 overflow-x-auto p-0">
          <table className="min-w-[1100px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#d9dee3] text-left text-xs uppercase tracking-wide text-[#5f6368] dark:border-[#2f3742] dark:text-[#a8b0ba]">
                <SortableHeader label="Task / Ticket" field="name" sortField={sortField} sortDirection={sortDirection} onSort={changeSort} />
                <SortableHeader label="Machine" field="machine" sortField={sortField} sortDirection={sortDirection} onSort={changeSort} />
                <SortableHeader label="Start" field="start" sortField={sortField} sortDirection={sortDirection} onSort={changeSort} />
                <SortableHeader label="Due / Updated" field="end" sortField={sortField} sortDirection={sortDirection} onSort={changeSort} />
                <SortableHeader label="Status" field="status" sortField={sortField} sortDirection={sortDirection} onSort={changeSort} />
                <SortableHeader label="Priority" field="priority" sortField={sortField} sortDirection={sortDirection} onSort={changeSort} />
                <th className="px-4 py-3 font-semibold">Assignee</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-[#5f6368] dark:text-[#a8b0ba]" colSpan={8}>
                    Loading dashboard...
                  </td>
                </tr>
              ) : null}
              {!loading && filteredItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-[#5f6368] dark:text-[#a8b0ba]" colSpan={8}>
                    No work items found.
                  </td>
                </tr>
              ) : null}
              {!loading ? filteredItems.map((item) => <DashboardRow key={`${item.recordType}-${item.id}`} item={item} />) : null}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );

  function changeSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }

    setSortField(field);
    setSortDirection(field === "name" || field === "machine" || field === "status" || field === "priority" ? "asc" : "desc");
  }
}

function SortableHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const active = field === sortField;

  return (
    <th className="px-4 py-3 font-semibold">
      <button
        className={`inline-flex items-center gap-1 text-left text-xs font-semibold uppercase tracking-wide transition ${
          active ? "text-[#155e75] dark:text-[#67e8f9]" : "hover:text-[#155e75] dark:hover:text-[#67e8f9]"
        }`}
        type="button"
        onClick={() => onSort(field)}
      >
        <span>{label}</span>
        <span aria-hidden="true">{active ? (sortDirection === "asc" ? "ASC" : "DESC") : "--"}</span>
      </button>
    </th>
  );
}

function DashboardRow({ item }: { item: DashboardItem }) {
  return (
    <tr className="border-b border-[#e8ebef] transition hover:bg-[#f8fbfc] dark:border-[#242c35] dark:hover:bg-[#151c24]">
      <td className="px-4 py-3">
        <div className="flex items-start gap-3">
          <span className={`mt-1 h-3 w-3 rounded-full ${item.recordType === "TASK" ? "bg-cyan-500" : "bg-amber-500"}`} />
          <div>
            <Link className="font-semibold text-[#155e75] underline-offset-4 hover:underline dark:text-[#67e8f9]" href={item.href}>
              {item.title}
            </Link>
            <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">
              {item.recordType === "TASK" ? "Task" : "Ticket"}
              {item.recordType === "TASK" && item.visibility === "PRIVATE" ? " / Private" : ""}
              {item.subtitle ? ` / ${item.subtitle}` : ""}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div>
          <span className="inline-flex rounded bg-[#e0f2fe] px-2 py-1 text-xs font-semibold text-[#075985] dark:bg-[#0c4a6e] dark:text-[#bae6fd]">{item.machineName}</span>
          <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">{item.customerName} / {item.machineSerialNumber}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-[#3c4043] dark:text-[#d7dde4]">{item.startAt ? formatDateTime(item.startAt) : "-"}</td>
      <td className={`px-4 py-3 ${item.isOverdue ? "font-semibold text-red-700 dark:text-red-300" : "text-[#3c4043] dark:text-[#d7dde4]"}`}>
        {item.dueAt ? formatDateTime(item.dueAt) : "-"}
      </td>
      <td className="px-4 py-3">
        <span className={`status-badge ${statusTone(item.status)}`}>{item.status.replaceAll("_", " ")}</span>
      </td>
      <td className="px-4 py-3">
        <span className={item.priority === "URGENT" || item.priority === "HIGH" ? "font-semibold text-amber-700 dark:text-amber-300" : "text-[#5f6368] dark:text-[#a8b0ba]"}>
          {item.priority.replaceAll("_", " ")}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex -space-x-2">
          {item.assignedTo.length > 0 ? item.assignedTo.slice(0, 4).map((assignee) => (
            <span
              key={assignee.id}
              className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-[#155e75] text-xs font-semibold text-white dark:border-[#171a21] dark:bg-[#22d3ee] dark:text-[#082f49]"
              title={assignee.name}
            >
              {initials(assignee.name)}
            </span>
          )) : <span className="text-xs text-[#5f6368] dark:text-[#a8b0ba]">Unassigned</span>}
        </div>
      </td>
      <td className="px-4 py-3">
        <Link className="field-button-primary inline-grid min-h-9 place-items-center px-4" href={item.href}>
          Open
        </Link>
      </td>
    </tr>
  );
}

function ActivityCard({ item }: { item: DashboardActivityItem }) {
  return (
    <Link
      className="rounded-lg border border-[#d9dee3] p-4 transition hover:border-[#155e75] hover:bg-[#f8fbfc] dark:border-[#2f3742] dark:hover:border-[#22d3ee] dark:hover:bg-[#151c24]"
      href={item.href}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`status-badge ${item.activityType === "MACHINE_LOG" ? "status-cyan" : "status-blue"}`}>
              {item.activityType === "MACHINE_LOG" ? "Machine Log" : "Ticket Status"}
            </span>
            {item.status ? <span className={`status-badge ${statusTone(item.status)}`}>{item.status.replaceAll("_", " ")}</span> : null}
          </div>
          <p className="mt-3 font-semibold text-[#155e75] dark:text-[#67e8f9]">{item.title}</p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-700 dark:text-neutral-200">{item.description}</p>
        </div>
        <span className="shrink-0 text-xs text-[#5f6368] dark:text-[#a8b0ba]">{formatRelativeTime(item.occurredAt)}</span>
      </div>
      <div className="mt-4 grid gap-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">
        <p>{item.customerName} / {item.machineName} / {item.machineSerialNumber}</p>
        <p>{item.actorName ? `By ${item.actorName}` : "Actor not recorded"} / {formatDateTime(item.occurredAt)}</p>
      </div>
    </Link>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "warning" }) {
  return (
    <div className="field-panel">
      <p className="field-muted text-sm">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${tone === "warning" && value > 0 ? "text-red-700 dark:text-red-300" : ""}`}>{value}</p>
    </div>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "COMPLETED":
    case "RESOLVED":
    case "CLOSED":
      return "status-green";
    case "IN_PROGRESS":
      return "status-cyan";
    case "WAITING_FOR_REQUESTER":
    case "WAITING_FOR_PARTS":
    case "PENDING_ACKNOWLEDGEMENT":
    case "WAITING_COMPONENT":
    case "WAITING_CUSTOMER":
      return "status-amber";
    case "FOLLOW_UP_REQUIRED":
      return "status-violet";
    case "CANCELLED":
      return "status-neutral";
    case "NEW":
      return "status-orange";
    default:
      return "status-blue";
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function compareDashboardItems(a: DashboardItem, b: DashboardItem, field: SortField, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;
  const result = compareValues(sortValue(a, field), sortValue(b, field));
  if (result !== 0) return result * multiplier;
  return compareValues(a.title, b.title);
}

function sortValue(item: DashboardItem, field: SortField) {
  switch (field) {
    case "name":
      return item.title;
    case "machine":
      return `${item.machineName} ${item.machineSerialNumber}`;
    case "start":
      return item.startAt ? new Date(item.startAt).getTime() : Number.MAX_SAFE_INTEGER;
    case "end":
      return item.dueAt ? new Date(item.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    case "status":
      return item.status;
    case "priority":
      return priorityRank(item.priority);
    case "priorityDue":
      return `${String(priorityRank(item.priority)).padStart(2, "0")} ${String(item.dueAt ? new Date(item.dueAt).getTime() : Number.MAX_SAFE_INTEGER).padStart(16, "0")} ${item.title}`;
    default:
      return item.title;
  }
}

function compareValues(a: string | number, b: string | number) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function priorityRank(priority: string) {
  const ranks: Record<string, number> = {
    URGENT: 1,
    HIGH: 2,
    NORMAL: 3,
    LOW: 4
  };

  return ranks[priority] ?? 99;
}

function isToday(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function isTerminalStatus(status: string) {
  return ["COMPLETED", "CLOSED", "RESOLVED", "CANCELLED"].includes(status);
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

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
