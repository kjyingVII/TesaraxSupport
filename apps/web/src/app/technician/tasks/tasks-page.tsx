"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminMenu } from "../../../components/admin-menu";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiRequest } from "../../../lib/api";
import { getAuthUser, type AuthUser } from "../../../lib/auth";

type Task = {
  id: string;
  title: string;
  taskType: string;
  description: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  status: string;
  priority: string;
  notifyRecipientName: string | null;
  notifyRecipientPhone: string | null;
  notifyRecipientEmail: string | null;
  notifiedAt: string | null;
  customer: {
    name: string;
  };
  machine: {
    id: string;
    machineName: string;
    serialNumber: string;
    location: string;
  };
  ticket: {
    id: string;
    ticketNumber: string;
    issueTitle: string;
    status: string;
  } | null;
  assignments: Array<{
    technician: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    };
  }>;
};

type TaskListResponse = {
  data: Task[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

type PendingAction =
  | { type: "cancel"; task: Task }
  | { type: "complete"; task: Task };

const statusOptions = [
  { label: "Active", value: "ACTIVE" },
  { label: "Pending", value: "PENDING" },
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Waiting Component", value: "WAITING_COMPONENT" },
  { label: "Waiting Customer", value: "WAITING_CUSTOMER" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" }
];

export function TasksPage() {
  const router = useRouter();
  const [user] = useState<AuthUser | null>(() => getAuthUser());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const activeTasks = useMemo(() => {
    return tasks.filter((task) => !["COMPLETED", "CANCELLED"].includes(task.status));
  }, [tasks]);

  useEffect(() => {
    void loadTasks();
  }, []);

  async function loadTasks(nextStatus = statusFilter, nextSearch = search) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: "1",
      pageSize: "50"
    });
    if (user?.role === "TECHNICIAN" && user.id) params.set("technicianId", user.id);
    if (nextStatus && nextStatus !== "ACTIVE") params.set("status", nextStatus);
    if (nextSearch.trim()) params.set("search", nextSearch.trim());

    try {
      const response = await apiRequest<TaskListResponse>(`/api/tasks?${params.toString()}`);
      const filtered = nextStatus === "ACTIVE"
        ? response.data.filter((task) => !["COMPLETED", "CANCELLED"].includes(task.status))
        : response.data;
      setTasks(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  function submitFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadTasks();
  }

  async function updateTask(id: string, action: "complete" | "cancel") {
    setBusyTaskId(id);
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/tasks/${id}/${action}`, {
        method: "PATCH"
      });
      setMessage(action === "complete" ? "Task marked completed." : "Task cancelled.");
      await loadTasks();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task.");
      return false;
    } finally {
      setBusyTaskId(null);
    }
  }

  async function completeTask(task: Task, openServiceReport = false) {
    const completed = await updateTask(task.id, "complete");

    if (completed && openServiceReport && task.ticket) {
      router.push(`/technician/tickets/${task.ticket.id}/service-report`);
    }
  }

  async function cancelTask(task: Task) {
    await updateTask(task.id, "cancel");
  }

  async function confirmPendingAction(openServiceReport = false) {
    if (!pendingAction) return;

    const action = pendingAction;
    setPendingAction(null);

    if (action.type === "cancel") {
      await cancelTask(action.task);
      return;
    }

    await completeTask(action.task, openServiceReport);
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-6xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">Technician</p>
            <h1 className="field-title">Upcoming Tasks</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link className="field-button-primary min-h-10" href="/technician/tasks/new">
              New task
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <AdminMenu />

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <Metric label="Shown" value={tasks.length} />
          <Metric label="Active" value={activeTasks.length} />
          <Metric label="Today" value={tasks.filter((task) => isToday(task.scheduledStartAt)).length} />
        </section>

        <section className="field-panel mt-5">
          <form className="grid gap-3 md:grid-cols-[180px_1fr_auto]" onSubmit={submitFilter}>
            <label className="block">
              <span className="field-label">Status</span>
              <select className="field-input h-11" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="field-label">Search</span>
              <input className="field-input h-11" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <button className="field-button-primary self-end" type="submit">
              Filter
            </button>
          </form>
        </section>

        {message ? <div className="field-alert-success mt-5 p-3 text-sm">{message}</div> : null}
        {error ? <div className="field-alert-error mt-5">{error}</div> : null}

        <section className="mt-5 grid gap-4">
          {loading ? <p className="field-muted">Loading tasks...</p> : null}
          {!loading && tasks.length === 0 ? <p className="field-muted">No tasks found.</p> : null}
          {tasks.map((task) => (
            <article key={task.id} className="field-panel">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link className="text-lg font-semibold text-[#155e75] underline-offset-4 hover:underline dark:text-[#67e8f9]" href={`/technician/tasks/${task.id}`}>
                      {task.title}
                    </Link>
                    <span className={`status-badge ${statusTone(task.status)}`}>{task.status.replaceAll("_", " ")}</span>
                    <span className="status-badge status-neutral">{task.taskType.replaceAll("_", " ")}</span>
                  </div>
                  <p className="field-muted mt-2">
                    {task.customer.name} / {task.machine.machineName} / {task.machine.serialNumber}
                  </p>
                  <p className="field-muted mt-1">{task.machine.location}</p>
                  <p className="mt-3 text-sm font-medium">
                    {formatDateTime(task.scheduledStartAt)}
                    {task.scheduledEndAt ? ` to ${formatDateTime(task.scheduledEndAt)}` : ""}
                  </p>
                  {task.description ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-neutral-200">{task.description}</p>
                  ) : null}
                  <p className="field-muted mt-3">
                    Assigned: {task.assignments.map((assignment) => assignment.technician.name).join(", ") || "Unassigned"}
                  </p>
                  <p className="field-muted mt-1">
                    Notify: {task.notifyRecipientName || "Not recorded"}
                    {task.notifyRecipientPhone ? ` / ${task.notifyRecipientPhone}` : ""}
                    {task.notifiedAt ? ` / sent ${formatDateTime(task.notifiedAt)}` : ""}
                  </p>
                  {task.ticket ? (
                    <p className="mt-3">
                      <Link className="field-link" href={`/technician/tickets/${task.ticket.id}`}>
                        {task.ticket.ticketNumber} / {task.ticket.issueTitle}
                      </Link>
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link className="field-button-secondary" href={`/machines/${task.machine.id}/logs/new`}>
                    Add Machine Log
                  </Link>
                  <Link className="field-button-primary" href={`/technician/tasks/${task.id}`}>
                    Open
                  </Link>
                  {!["COMPLETED", "CANCELLED"].includes(task.status) ? (
                    <>
                      <button
                        className="field-button-primary disabled:opacity-50"
                        type="button"
                        disabled={busyTaskId === task.id}
                        onClick={() => setPendingAction({ type: "complete", task })}
                      >
                        Complete
                      </button>
                      <button
                        className="field-button-secondary disabled:opacity-50"
                        type="button"
                        disabled={busyTaskId === task.id}
                        onClick={() => setPendingAction({ type: "cancel", task })}
                      >
                        Cancel
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>

        {pendingAction ? (
          <ActionDialog
            action={pendingAction}
            busy={busyTaskId === pendingAction.task.id}
            onClose={() => setPendingAction(null)}
            onCancelTask={() => void confirmPendingAction()}
            onCompleteOnly={() => void confirmPendingAction(false)}
            onCompleteWithReport={() => void confirmPendingAction(true)}
          />
        ) : null}
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

function ActionDialog({
  action,
  busy,
  onClose,
  onCancelTask,
  onCompleteOnly,
  onCompleteWithReport
}: {
  action: PendingAction;
  busy: boolean;
  onClose: () => void;
  onCancelTask: () => void;
  onCompleteOnly: () => void;
  onCompleteWithReport: () => void;
}) {
  const task = action.task;
  const isCancel = action.type === "cancel";
  const isTicketLinked = Boolean(task.ticket);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <section className="w-full max-w-lg rounded-lg border border-[#d9dee3] bg-white p-5 shadow-xl dark:border-[#2f3742] dark:bg-[#171a21]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="field-eyebrow">{isCancel ? "Cancel Task" : "Complete Task"}</p>
            <h2 className="mt-1 text-xl font-semibold">
              {isCancel ? "Cancel this task?" : "Mark this task complete?"}
            </h2>
          </div>
          <button
            className="field-button-secondary min-h-9 px-3"
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            X
          </button>
        </div>

        <div className="field-panel-subtle mt-5 text-sm">
          <p className="font-semibold">{task.title}</p>
          <p className="field-muted mt-2">
            {task.customer.name} / {task.machine.machineName} / {task.machine.serialNumber}
          </p>
          <p className="mt-3">
            {formatDateTime(task.scheduledStartAt)}
            {task.scheduledEndAt ? ` to ${formatDateTime(task.scheduledEndAt)}` : ""}
          </p>
          {task.ticket ? (
            <p className="field-muted mt-3">
              Linked ticket: {task.ticket.ticketNumber} / {task.ticket.issueTitle}
            </p>
          ) : null}
        </div>

        {isCancel ? (
          <p className="mt-5 text-sm leading-6 text-neutral-700 dark:text-neutral-200">
            This will mark the task as cancelled. The record will remain visible for tracking and audit history.
          </p>
        ) : (
          <p className="mt-5 text-sm leading-6 text-neutral-700 dark:text-neutral-200">
            This will mark the Task as completed.
            {isTicketLinked ? " You can continue directly to the service report form after completing it." : ""}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="field-button-secondary" type="button" onClick={onClose} disabled={busy}>
            Keep Task
          </button>

          {isCancel ? (
            <button
              className="grid min-h-10 place-items-center rounded-md border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-800 transition hover:border-red-500 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
              type="button"
              onClick={onCancelTask}
              disabled={busy}
            >
              {busy ? "Cancelling..." : "Cancel Task"}
            </button>
          ) : (
            <>
              <button className="field-button-secondary" type="button" onClick={onCompleteOnly} disabled={busy}>
                {busy ? "Completing..." : "Complete Only"}
              </button>
              {isTicketLinked ? (
                <button className="field-button-primary" type="button" onClick={onCompleteWithReport} disabled={busy}>
                  Complete & Submit Report
                </button>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "COMPLETED":
      return "status-green";
    case "CANCELLED":
      return "status-neutral";
    case "IN_PROGRESS":
      return "status-cyan";
    case "WAITING_COMPONENT":
    case "WAITING_CUSTOMER":
      return "status-amber";
    default:
      return "status-blue";
  }
}

function isToday(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function formatDateTime(value: string | null) {
  if (!value) return "Not confirmed";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
