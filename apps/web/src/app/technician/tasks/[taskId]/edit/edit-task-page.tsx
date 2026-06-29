"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminMenu } from "../../../../../components/admin-menu";
import { PhoneNumberInput, isValidPhoneNumber } from "../../../../../components/phone-number-input";
import { SearchableMultiSelect } from "../../../../../components/searchable-combobox";
import { ThemeToggle } from "../../../../../components/theme-toggle";
import { apiRequest } from "../../../../../lib/api";

type Technician = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

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
  internalRemarks: string | null;
  customer: {
    name: string;
  };
  machine: {
    machineName: string;
    model: string;
    serialNumber: string;
    location: string;
  };
  ticket: {
    id: string;
    ticketNumber: string;
    issueTitle: string;
  } | null;
  assignments: Array<{
    technician: Technician;
  }>;
};

type TaskResponse = {
  data: Task;
};

type TechnicianListResponse = {
  data: Technician[];
};

const taskTypeOptions = [
  { label: "Corrective Service", value: "CORRECTIVE_SERVICE" },
  { label: "Machine Maintenance", value: "MACHINE_MAINTENANCE" },
  { label: "Component Replacement", value: "COMPONENT_REPLACEMENT" },
  { label: "Inspection / Diagnosis", value: "INSPECTION_DIAGNOSIS" },
  { label: "Upgrade", value: "UPGRADE" },
  { label: "Follow Up Visit", value: "FOLLOW_UP_VISIT" },
  { label: "Other", value: "OTHER" }
];

const priorityOptions = [
  { label: "Normal", value: "NORMAL" },
  { label: "Urgent", value: "URGENT" },
  { label: "Machine Down", value: "MACHINE_DOWN" },
  { label: "Low", value: "LOW" }
];

const statusOptions = [
  { label: "Pending", value: "PENDING" },
  { label: "Scheduled", value: "SCHEDULED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Waiting Component", value: "WAITING_COMPONENT" },
  { label: "Waiting Customer", value: "WAITING_CUSTOMER" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" }
];

const emptyForm = {
  title: "",
  taskType: "MACHINE_MAINTENANCE",
  priority: "NORMAL",
  status: "SCHEDULED",
  scheduledStartAt: "",
  scheduledEndAt: "",
  description: "",
  notifyRecipientName: "",
  notifyRecipientPhone: "",
  notifyRecipientEmail: "",
  internalRemarks: ""
};

export function EditTaskPage({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);

  const hasValidPhone = useMemo(() => {
    return !form.notifyRecipientPhone.trim() || isValidPhoneNumber(form.notifyRecipientPhone);
  }, [form.notifyRecipientPhone]);

  const taskTimeChanged = useMemo(() => {
    if (!task) return false;
    const originalStart = task.scheduledStartAt ? toDateTimeLocal(task.scheduledStartAt) : "";
    const originalEnd = task.scheduledEndAt ? toDateTimeLocal(task.scheduledEndAt) : "";
    return form.scheduledStartAt !== originalStart || form.scheduledEndAt !== originalEnd;
  }, [form.scheduledEndAt, form.scheduledStartAt, task]);

  useEffect(() => {
    void loadPage();
  }, [taskId]);

  async function loadPage() {
    setLoading(true);
    setError(null);

    try {
      const [taskResponse, technicianResponse] = await Promise.all([
        apiRequest<TaskResponse>(`/api/tasks/${taskId}`),
        apiRequest<TechnicianListResponse>("/api/tickets/technicians")
      ]);

      setTask(taskResponse.data);
      setTechnicians(technicianResponse.data);
      setSelectedTechnicianIds(taskResponse.data.assignments.map((assignment) => assignment.technician.id));
      setForm({
        title: taskResponse.data.title,
        taskType: taskResponse.data.taskType,
        priority: taskResponse.data.priority,
        status: taskResponse.data.status,
        scheduledStartAt: taskResponse.data.scheduledStartAt ? toDateTimeLocal(taskResponse.data.scheduledStartAt) : "",
        scheduledEndAt: taskResponse.data.scheduledEndAt ? toDateTimeLocal(taskResponse.data.scheduledEndAt) : "",
        description: taskResponse.data.description ?? "",
        notifyRecipientName: taskResponse.data.notifyRecipientName ?? "",
        notifyRecipientPhone: taskResponse.data.notifyRecipientPhone ?? "",
        notifyRecipientEmail: taskResponse.data.notifyRecipientEmail ?? "",
        internalRemarks: taskResponse.data.internalRemarks ?? ""
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load task.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSaveSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (taskTimeChanged) {
      setShowNotifyDialog(true);
      return;
    }

    void saveTask(false);
  }

  async function saveTask(notifyUser: boolean) {
    setSaving(true);
    setError(null);
    setMessage(null);
    setShowNotifyDialog(false);

    try {
      const response = await apiRequest<TaskResponse>(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: form.title,
          taskType: form.taskType,
          priority: form.priority,
          status: form.status,
          scheduledStartAt: form.scheduledStartAt ? new Date(form.scheduledStartAt).toISOString() : null,
          scheduledEndAt: form.scheduledEndAt ? new Date(form.scheduledEndAt).toISOString() : null,
          description: form.description || null,
          notifyRecipientName: form.notifyRecipientName || null,
          notifyRecipientPhone: form.notifyRecipientPhone || null,
          notifyRecipientEmail: form.notifyRecipientEmail || null,
          internalRemarks: form.internalRemarks || null,
          assignedTechnicianIds: selectedTechnicianIds
        })
      });

      if (notifyUser) {
        await apiRequest<TaskResponse>(`/api/tasks/${taskId}/notify-reschedule`, {
          method: "PATCH"
        });
      }

      setTask(response.data);
      setMessage(notifyUser ? "Task updated and user notification logged." : "Task updated.");
      router.push(`/technician/tasks/${taskId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-4xl">
        <header className="field-header">
          <div>
            <nav className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[#5f6368] dark:text-[#a8b0ba]">
              <Link className="field-link" href="/admin">
                Home
              </Link>
              <span>/</span>
              <Link className="field-link" href="/technician/tasks">
                Tasks
              </Link>
              <span>/</span>
              <span>Edit</span>
            </nav>
            <h1 className="field-title">Edit task</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link className="field-button-secondary" href={task ? `/technician/tasks/${task.id}` : "/technician/tasks"}>
              Back
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <AdminMenu />

        <section className="field-panel mt-5">
          {loading ? <p className="field-muted">Loading...</p> : null}
          {error ? <div className="field-alert-error">{error}</div> : null}
          {message ? <div className="field-alert-success p-3 text-sm">{message}</div> : null}

          {!loading && task ? (
            <form className="mt-4 grid gap-5" onSubmit={handleSaveSubmit}>
              <div className="field-panel-subtle grid gap-2 text-sm sm:grid-cols-2">
                <Info label="Customer" value={task.customer.name} />
                <Info label="Machine" value={task.machine.machineName} />
                <Info label="Model" value={task.machine.model} />
                <Info label="Serial No." value={task.machine.serialNumber} />
                <Info label="Location" value={task.machine.location} />
                <Info label="Linked Ticket" value={task.ticket ? `${task.ticket.ticketNumber} / ${task.ticket.issueTitle}` : "None"} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <TextInput label="Title" value={form.title} required onChange={(value) => updateField("title", value)} />
                <label className="block">
                  <span className="field-label">Task Type</span>
                  <select className="field-input h-11" value={form.taskType} onChange={(event) => updateField("taskType", event.target.value)}>
                    {taskTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="field-label">Status</span>
                  <select className="field-input h-11" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">Priority</span>
                  <select className="field-input h-11" value={form.priority} onChange={(event) => updateField("priority", event.target.value)}>
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <TextInput label="Start Time" type="datetime-local" value={form.scheduledStartAt} onChange={(value) => updateField("scheduledStartAt", value)} />
              </div>

              <TextInput label="End Time" type="datetime-local" value={form.scheduledEndAt} onChange={(value) => updateField("scheduledEndAt", value)} />
              <TextAreaInput label="Description" value={form.description} onChange={(value) => updateField("description", value)} />

              <section className="field-panel-subtle grid gap-4">
                <div>
                  <h2 className="field-section-title text-base">User to Notify</h2>
                  <p className="field-muted mt-1">Update the contact used for task communication. Editing this task does not resend WhatsApp automatically.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput label="Name" value={form.notifyRecipientName} onChange={(value) => updateField("notifyRecipientName", value)} />
                  <TextInput label="Email" type="email" value={form.notifyRecipientEmail} onChange={(value) => updateField("notifyRecipientEmail", value)} />
                </div>
                <PhoneNumberInput label="Phone" value={form.notifyRecipientPhone} onChange={(value) => updateField("notifyRecipientPhone", value)} />
              </section>

              <SearchableMultiSelect
                label="Assigned Technicians"
                options={technicians.map((technician) => ({
                  value: technician.id,
                  label: technician.name,
                  description: `${technician.email}${technician.phone ? ` / ${technician.phone}` : ""}`
                }))}
                selectedValues={selectedTechnicianIds}
                placeholder="Search technician by name, email, or phone"
                emptyText="No matching technician."
                onChange={setSelectedTechnicianIds}
              />

              <TextAreaInput label="Internal Remarks" value={form.internalRemarks} onChange={(value) => updateField("internalRemarks", value)} />

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Link className="field-button-secondary" href={task ? `/technician/tasks/${task.id}` : "/technician/tasks"}>
                  Cancel
                </Link>
                <button
                  className="field-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                  disabled={saving || !form.title.trim() || !hasValidPhone}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : null}
        </section>

        {showNotifyDialog ? (
          <RescheduleNotifyDialog
            taskTitle={form.title}
            recipientName={form.notifyRecipientName}
            recipientPhone={form.notifyRecipientPhone}
            startAt={form.scheduledStartAt}
            endAt={form.scheduledEndAt}
            saving={saving}
            onClose={() => setShowNotifyDialog(false)}
            onSaveOnly={() => void saveTask(false)}
            onSaveAndNotify={() => void saveTask(true)}
          />
        ) : null}
      </section>
    </main>
  );
}

function RescheduleNotifyDialog({
  taskTitle,
  recipientName,
  recipientPhone,
  startAt,
  endAt,
  saving,
  onClose,
  onSaveOnly,
  onSaveAndNotify
}: {
  taskTitle: string;
  recipientName: string;
  recipientPhone: string;
  startAt: string;
  endAt: string;
  saving: boolean;
  onClose: () => void;
  onSaveOnly: () => void;
  onSaveAndNotify: () => void;
}) {
  const canNotify = Boolean(recipientName.trim() && isValidPhoneNumber(recipientPhone));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <section className="w-full max-w-lg rounded-lg border border-[#d9dee3] bg-white p-5 shadow-xl dark:border-[#2f3742] dark:bg-[#171a21]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="field-eyebrow">Reschedule notification</p>
            <h2 className="mt-1 text-xl font-semibold">Notify user about the new time?</h2>
          </div>
          <button className="field-button-secondary min-h-9 px-3" type="button" onClick={onClose} disabled={saving} aria-label="Close">
            X
          </button>
        </div>

        <div className="field-panel-subtle mt-5 text-sm">
          <p className="font-semibold">{taskTitle || "task"}</p>
          <p className="mt-3">
            {formatDialogDateTime(startAt)}
            {endAt ? ` to ${formatDialogDateTime(endAt)}` : ""}
          </p>
          <p className="field-muted mt-3">
            Notify: {recipientName || "No name"}{recipientPhone ? ` / ${recipientPhone}` : ""}
          </p>
        </div>

        <p className="mt-5 text-sm leading-6 text-neutral-700 dark:text-neutral-200">
          The task time changed. You can save the change silently, or send/log a WhatsApp reschedule notification for the user.
        </p>

        {!canNotify ? (
          <div className="field-alert-warning mt-4 p-3 text-sm">
            Add a valid notification name and phone number before sending WhatsApp.
          </div>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="field-button-secondary" type="button" onClick={onClose} disabled={saving}>
            Continue Editing
          </button>
          <button className="field-button-secondary" type="button" onClick={onSaveOnly} disabled={saving}>
            {saving ? "Saving..." : "Save Only"}
          </button>
          <button className="field-button-primary" type="button" onClick={onSaveAndNotify} disabled={saving || !canNotify}>
            {saving ? "Saving..." : "Save & Notify User"}
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

function TextInput({
  label,
  value,
  onChange,
  required,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input className="field-input h-11" type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <textarea className="field-textarea min-h-24" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDialogDateTime(value: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
