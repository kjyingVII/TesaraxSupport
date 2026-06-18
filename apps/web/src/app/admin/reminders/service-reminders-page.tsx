"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminMenu } from "../../../components/admin-menu";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiRequest } from "../../../lib/api";

type Machine = {
  id: string;
  machineName: string;
  model: string;
  serialNumber: string;
  location: string;
  serviceReminderIntervalDays: number;
  lastServiceAt: string | null;
  nextServiceDueAt: string | null;
  isActive: boolean;
  customer: {
    name: string;
  };
  _count: {
    tickets: number;
    logs: number;
  };
};

type MachineListResponse = {
  data: Machine[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type SettingsResponse = {
  data: {
    reminderWindowDays: number;
  };
};

const statusOptions = [
  { label: "Upcoming", value: "UPCOMING" },
  { label: "Due Today", value: "DUE" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "No Reminder", value: "NO_REMINDER" },
  { label: "OK", value: "OK" }
];

export function ServiceRemindersPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [status, setStatus] = useState("UPCOMING");
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [reminderWindowDays, setReminderWindowDays] = useState(30);
  const [meta, setMeta] = useState<MachineListResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadPage();
  }, []);

  const heading = useMemo(() => statusOptions.find((option) => option.value === status)?.label ?? "Reminders", [status]);

  async function loadPage(nextStatus = status, nextSearch = search) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "50",
        serviceStatus: nextStatus
      });
      if (nextSearch.trim()) params.set("search", nextSearch.trim());

      const [machineResponse, settingsResponse, ...countResponses] = await Promise.all([
        apiRequest<MachineListResponse>(`/api/machines?${params.toString()}`),
        apiRequest<SettingsResponse>("/api/settings"),
        ...statusOptions.map((option) => apiRequest<MachineListResponse>(`/api/machines?serviceStatus=${option.value}&page=1&pageSize=1`))
      ]);

      setMachines(machineResponse.data);
      setMeta(machineResponse.meta);
      setReminderWindowDays(settingsResponse.data.reminderWindowDays);
      setCounts(
        Object.fromEntries(statusOptions.map((option, index) => [option.value, countResponses[index].meta.total]))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load service reminders.");
    } finally {
      setLoading(false);
    }
  }

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadPage();
  }

  function changeStatus(value: string) {
    setStatus(value);
    void loadPage(value, search);
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
              <span>Reminders</span>
            </nav>
            <h1 className="field-title">Service Reminders</h1>
          </div>
          <ThemeToggle />
        </header>

        <AdminMenu />

        {error ? (
          <div className="field-alert-error mt-5">
            {error}
          </div>
        ) : null}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              className={`rounded-lg border p-4 text-left shadow-sm transition ${
                status === option.value
                  ? "border-[#155e75] bg-[#155e75] text-white dark:border-[#22d3ee] dark:bg-[#22d3ee] dark:text-[#082f49]"
                  : "border-[#d9dee3] bg-white hover:border-[#155e75] hover:bg-cyan-50/40 dark:border-[#2f3742] dark:bg-[#171a21] dark:hover:border-[#22d3ee] dark:hover:bg-[#1f242d]"
              }`}
              type="button"
              onClick={() => changeStatus(option.value)}
            >
              <p className="text-sm opacity-80">{option.label}</p>
              <p className="mt-2 text-2xl font-semibold">{loading ? "..." : counts[option.value] ?? 0}</p>
            </button>
          ))}
        </section>

        <section className="field-panel mt-5 p-0">
          <div className="border-b border-[#d9dee3] p-5 dark:border-[#2f3742]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="field-section-title">{heading}</h2>
                <p className="field-muted mt-1">
                  Upcoming uses the configured {reminderWindowDays}-day reminder window.
                </p>
              </div>
              <form className="grid gap-3 sm:grid-cols-[180px_minmax(220px,1fr)_auto]" onSubmit={handleFilter}>
                <select
                  className="field-input mt-0 h-11"
                  value={status}
                  onChange={(event) => changeStatus(event.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  className="field-input mt-0 h-11"
                  placeholder="Search machine, serial, customer"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <button className="field-button-primary" type="submit">
                  Apply
                </button>
              </form>
            </div>
          </div>

          <div className="divide-y divide-[#d9dee3] dark:divide-[#2f3742]">
            {loading ? <p className="field-muted p-5">Loading...</p> : null}
            {!loading && machines.length === 0 ? (
              <p className="field-muted p-5">No machines found for this reminder status.</p>
            ) : null}
            {machines.map((machine) => (
              <article key={machine.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill machine={machine} />
                      <span className="rounded-md border border-neutral-200 px-2.5 py-1 text-xs dark:border-neutral-700">
                        {machine.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold">{machine.machineName}</h3>
                    <p className="field-muted mt-1">
                      {machine.customer.name} / {machine.model} / {machine.serialNumber}
                    </p>
                    <p className="field-muted mt-1">{machine.location}</p>
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-3 lg:min-w-[480px]">
                    <MiniMetric label="Last Service" value={machine.lastServiceAt ? formatDate(machine.lastServiceAt) : "None"} />
                    <MiniMetric label="Next Due" value={machine.nextServiceDueAt ? formatDate(machine.nextServiceDueAt) : "Not set"} />
                    <MiniMetric label="Interval" value={`${machine.serviceReminderIntervalDays} days`} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link className="field-button-secondary" href={`/machines/${machine.id}/logs`}>
                    View Log
                  </Link>
                  <Link className="field-button-secondary" href={`/machines/${machine.id}/logs/new`}>
                    Add Service Log
                  </Link>
                  <Link className="field-button-secondary" href={`/admin/machines/${machine.id}/edit`}>
                    Edit Reminder
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {!loading && meta ? (
            <div className="border-t border-[#d9dee3] p-4 text-sm text-[#5f6368] dark:border-[#2f3742] dark:text-[#a8b0ba]">
              Showing {machines.length} of {meta.total} machine(s).
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function StatusPill({ machine }: { machine: Machine }) {
  const label = serviceStatusLabel(machine.nextServiceDueAt);
  return <span className={`status-badge ${statusTone(label)}`}>{label}</span>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-panel-subtle">
      <p className="field-meta-label">{label}</p>
      <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200">{value}</p>
    </div>
  );
}

function statusTone(label: string) {
  switch (label) {
    case "Overdue":
      return "status-orange";
    case "Due Today":
      return "status-amber";
    case "Upcoming":
      return "status-blue";
    case "No Reminder":
      return "status-neutral";
    default:
      return "status-green";
  }
}

function serviceStatusLabel(value: string | null) {
  if (!value) return "No Reminder";
  const due = new Date(value);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const tomorrowStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();
  const dueTime = due.getTime();

  if (dueTime < todayStart) return "Overdue";
  if (dueTime >= todayStart && dueTime < tomorrowStart) return "Due Today";
  return "Upcoming";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}
