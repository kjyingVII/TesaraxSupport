"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AdminMenu } from "../../../../components/admin-menu";
import { ThemeToggle } from "../../../../components/theme-toggle";
import { apiRequest } from "../../../../lib/api";
import { getAuthUser, type AuthUser } from "../../../../lib/auth";

type Task = {
  id: string;
  title: string;
  taskType: string;
  description: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  status: string;
  visibility: string;
  priority: string;
  notifyRecipientName: string | null;
  notifyRecipientPhone: string | null;
  notifyRecipientEmail: string | null;
  notifiedAt: string | null;
  internalRemarks: string | null;
  completedAt: string | null;
  customer: {
    name: string;
  };
  machine: {
    id: string;
    machineName: string;
    model: string;
    serialNumber: string;
    location: string;
  };
  ticket: {
    id: string;
    ticketNumber: string;
    issueTitle: string;
    status: string;
    priority: string;
  } | null;
  createdByUser: {
    name: string;
    email: string;
    role: string;
  };
  completedByUser: {
    name: string;
    email: string;
    role: string;
  } | null;
  assignments: Array<{
    technician: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      role: string;
    };
  }>;
};

type TaskComment = {
  id: string;
  comment: string;
  createdAt: string;
  createdByUser: {
    name: string;
    email: string;
    role: string;
  };
};

type TaskResponse = { data: Task };
type TaskCommentsResponse = { data: TaskComment[] };

const taskStatusOptions = [
  { label: "Pending", value: "PENDING" },
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Waiting Component", value: "WAITING_COMPONENT" },
  { label: "Waiting Customer", value: "WAITING_CUSTOMER" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" }
];

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [user] = useState<AuthUser | null>(() => getAuthUser());
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingComment, setSavingComment] = useState(false);
  const [busyAction, setBusyAction] = useState<"complete" | "status" | "delete" | null>(null);
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    void loadTask();
  }, [taskId]);

  async function loadTask() {
    setLoading(true);
    setError(null);

    try {
      const [taskResponse, commentResponse] = await Promise.all([
        apiRequest<TaskResponse>(`/api/tasks/${taskId}`),
        apiRequest<TaskCommentsResponse>(`/api/tasks/${taskId}/comments`)
      ]);
      setTask(taskResponse.data);
      setComments(commentResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load task.");
    } finally {
      setLoading(false);
    }
  }

  async function updateTask(action: "complete") {
    setBusyAction(action);
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/tasks/${taskId}/${action}`, { method: "PATCH" });
      setMessage("Task marked completed.");
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task.");
    } finally {
      setBusyAction(null);
    }
  }

  async function updateTaskStatus(status: string) {
    setBusyAction("status");
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setMessage(`Task status changed to ${formatStatusLabel(status)}.`);
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task.");
    } finally {
      setBusyAction(null);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comment.trim()) return;

    setSavingComment(true);
    setError(null);

    try {
      const response = await apiRequest<{ data: TaskComment }>(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        body: JSON.stringify({ comment })
      });
      setComments((current) => [...current, response.data]);
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add comment.");
    } finally {
      setSavingComment(false);
    }
  }

  async function deleteTask() {
    if (!pendingDeleteTask) return;

    setBusyAction("delete");
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/tasks/${pendingDeleteTask.id}`, { method: "DELETE" });
      router.push("/technician/tasks");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete task.");
      setPendingDeleteTask(null);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-6xl">
        <header className="field-header">
          <div>
            <nav className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[#5f6368] dark:text-[#a8b0ba]">
              <Link className="field-link" href="/admin">Home</Link>
              <span>/</span>
              <Link className="field-link" href="/technician/tasks">Tasks</Link>
              <span>/</span>
              <span>Detail</span>
            </nav>
            <h1 className="field-title">{task?.title ?? "Task Detail"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link className="field-button-secondary" href="/technician/tasks">Back</Link>
            <ThemeToggle />
          </div>
        </header>

        <AdminMenu />

        {message ? <div className="field-alert-success mt-5 p-3 text-sm">{message}</div> : null}
        {error ? <div className="field-alert-error mt-5">{error}</div> : null}
        {loading ? <p className="field-muted mt-5">Loading task...</p> : null}

        {!loading && task ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
            <section className="grid gap-5">
              <div className="field-panel">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`status-badge ${statusTone(task.status)}`}>{task.status.replaceAll("_", " ")}</span>
                      <span className={`status-badge ${task.visibility === "PRIVATE" ? "status-violet" : "status-neutral"}`}>
                        {task.visibility === "PRIVATE" ? "Private" : "Team"}
                      </span>
                      <span className="status-badge status-neutral">{task.taskType.replaceAll("_", " ")}</span>
                      <span className="status-badge status-blue">{task.priority.replaceAll("_", " ")}</span>
                    </div>
                    <p className="mt-3 text-sm font-medium">
                      {formatDateTime(task.scheduledStartAt)}
                      {task.scheduledEndAt ? ` to ${formatDateTime(task.scheduledEndAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link className="field-button-secondary" href={`/technician/tasks/${task.id}/edit`}>Edit Task</Link>
                    <Link className="field-button-secondary" href={`/machines/${task.machine.id}/logs/new`}>Add Machine Log</Link>
                    {task.ticket ? (
                      <Link className="field-button-primary" href={`/technician/tickets/${task.ticket.id}/service-report`}>Submit Service Report</Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Info label="Customer" value={task.customer.name} />
                  <Info label="Machine" value={`${task.machine.machineName} / ${task.machine.serialNumber}`} />
                  <Info label="Model" value={task.machine.model} />
                  <Info label="Location" value={task.machine.location} />
                  <Info label="Created By" value={`${task.createdByUser.name} / ${task.createdByUser.role}`} />
                  <Info label="Visibility" value={task.visibility === "PRIVATE" ? "Private task" : "Team task"} />
                  <Info label="Completed By" value={task.completedByUser ? `${task.completedByUser.name} / ${formatDateTime(task.completedAt)}` : "Not completed"} />
                </div>

                {task.description ? (
                  <div className="mt-5">
                    <p className="field-meta-label">Description</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-700 dark:text-neutral-200">{task.description}</p>
                  </div>
                ) : null}

                {task.internalRemarks ? (
                  <div className="field-panel-subtle mt-5">
                    <p className="field-meta-label">Internal Remarks</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{task.internalRemarks}</p>
                  </div>
                ) : null}
              </div>

              <section className="field-panel">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="field-section-title">Internal Comments</h2>
                  <span className="field-muted text-sm">{comments.length}</span>
                </div>

                <div className="mt-4 grid gap-3">
                  {comments.length === 0 ? <p className="field-muted">No internal comments yet.</p> : null}
                  {comments.map((item) => (
                    <article key={item.id} className="field-panel-subtle">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{item.createdByUser.name}</p>
                        <p className="field-muted text-xs">{formatDateTime(item.createdAt)}</p>
                      </div>
                      <p className="field-muted mt-1 text-xs">{item.createdByUser.role} / {item.createdByUser.email}</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{item.comment}</p>
                    </article>
                  ))}
                </div>

                <form className="mt-4 grid gap-3" onSubmit={submitComment}>
                  <label className="block">
                    <span className="field-label">Add Comment</span>
                    <textarea className="field-textarea min-h-24" value={comment} onChange={(event) => setComment(event.target.value)} />
                  </label>
                  <div className="flex justify-end">
                    <button className="field-button-primary disabled:opacity-50" type="submit" disabled={savingComment || !comment.trim()}>
                      {savingComment ? "Posting..." : "Post Comment"}
                    </button>
                  </div>
                </form>
              </section>
            </section>

            <aside className="grid content-start gap-5">
              <section className="field-panel">
                <h2 className="field-section-title">Linked Records</h2>
                <div className="mt-4 grid gap-3 text-sm">
                  {task.ticket ? (
                    <Link className="field-link" href={`/technician/tickets/${task.ticket.id}`}>
                      {task.ticket.ticketNumber} / {task.ticket.issueTitle}
                    </Link>
                  ) : <p className="field-muted">No ticket linked.</p>}
                  <Link className="field-link" href={`/machines/${task.machine.id}/logs`}>
                    Machine log history
                  </Link>
                </div>
              </section>

              <section className="field-panel">
                <h2 className="field-section-title">Assigned Team</h2>
                <div className="mt-4 grid gap-3">
                  {task.assignments.length === 0 ? <p className="field-muted">Unassigned</p> : null}
                  {task.assignments.map((assignment) => (
                    <div key={assignment.technician.id} className="field-panel-subtle text-sm">
                      <p className="font-semibold">{assignment.technician.name}</p>
                      <p className="field-muted mt-1">{assignment.technician.email}</p>
                      {assignment.technician.phone ? <p className="field-muted mt-1">{assignment.technician.phone}</p> : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="field-panel">
                <h2 className="field-section-title">User Notification</h2>
                {task.visibility === "PRIVATE" ? (
                  <p className="field-muted mt-4 text-sm">Private task. User notifications are not sent.</p>
                ) : (
                  <div className="mt-4 grid gap-2 text-sm">
                    <Info label="Name" value={task.notifyRecipientName || "Not recorded"} />
                    <Info label="Phone" value={task.notifyRecipientPhone || "Not recorded"} />
                    <Info label="Email" value={task.notifyRecipientEmail || "Not recorded"} />
                    <Info label="Last Sent" value={task.notifiedAt ? formatDateTime(task.notifiedAt) : "Not sent"} />
                  </div>
                )}
              </section>

              <section className="field-panel">
                <h2 className="field-section-title">Actions</h2>
                <div className="mt-4 grid gap-2">
                  <button
                    className="field-button-primary disabled:opacity-50"
                    type="button"
                    disabled={busyAction !== null || task.status === "COMPLETED"}
                    onClick={() => void updateTask("complete")}
                  >
                    {busyAction === "complete" ? "Completing..." : "Mark Completed"}
                  </button>
                  <div className="mt-3 border-t border-[#d9dee3] pt-4 dark:border-[#2f3742]">
                    <p className="field-meta-label mb-2">Change Status</p>
                    <div className="grid gap-2">
                      {taskStatusOptions.map((option) => (
                        <button
                          key={option.value}
                          className="field-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                          type="button"
                          disabled={busyAction !== null || task.status === option.value}
                          onClick={() => void updateTaskStatus(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {isAdmin ? (
                <section className="field-panel">
                  <h2 className="field-section-title">Admin Delete</h2>
                  <p className="field-muted mt-3 text-sm">
                    Delete this task only after confirming it is no longer needed for planning or audit review.
                  </p>
                  <button
                    className="mt-4 w-full rounded-md border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/30"
                    type="button"
                    disabled={busyAction !== null}
                    onClick={() => setPendingDeleteTask(task)}
                  >
                    Delete Task
                  </button>
                </section>
              ) : null}
            </aside>
          </div>
        ) : null}
      </section>
      {pendingDeleteTask ? (
        <DeleteTaskDialog
          task={pendingDeleteTask}
          busy={busyAction === "delete"}
          onClose={() => setPendingDeleteTask(null)}
          onConfirm={() => void deleteTask()}
        />
      ) : null}
    </main>
  );
}

function DeleteTaskDialog({
  task,
  busy,
  onClose,
  onConfirm
}: {
  task: Task;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <section className="w-full max-w-lg rounded-lg border border-[#d9dee3] bg-white p-5 shadow-xl dark:border-[#2f3742] dark:bg-[#171a21]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="field-eyebrow">Delete Task</p>
            <h2 className="mt-1 text-xl font-semibold">Delete this task?</h2>
          </div>
          <button className="field-button-secondary min-h-9 px-3" type="button" onClick={onClose} disabled={busy} aria-label="Close">
            X
          </button>
        </div>

        <div className="field-panel-subtle mt-5 text-sm">
          <p className="font-semibold">{task.title}</p>
          <p className="field-muted mt-2">{task.customer.name} / {task.machine.machineName}</p>
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

        <p className="mt-5 text-sm leading-6 text-neutral-700 dark:text-neutral-200">
          This will permanently remove the task, its assignments, and internal task comments. An audit record will be kept for traceability.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="field-button-secondary" type="button" onClick={onClose} disabled={busy}>
            Keep Task
          </button>
          <button
            className="grid min-h-10 place-items-center rounded-md border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-800 transition hover:border-red-500 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
            type="button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Deleting..." : "Delete Task"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="field-meta-label">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
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

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
