"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminMenu } from "../../../../components/admin-menu";
import { PhoneNumberInput, isValidPhoneNumber } from "../../../../components/phone-number-input";
import { SearchableMultiSelect, SearchableSingleSelect } from "../../../../components/searchable-combobox";
import { ThemeToggle } from "../../../../components/theme-toggle";
import { apiRequest } from "../../../../lib/api";
import { getAuthUser, type AuthUser } from "../../../../lib/auth";

type Machine = {
  id: string;
  machineName: string;
  model: string;
  serialNumber: string;
  location: string;
  customer: {
    id: string;
    name: string;
  };
};

type Technician = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type MachineListResponse = {
  data: Machine[];
};

type TechnicianListResponse = {
  data: Technician[];
};

type TaskResponse = {
  data: {
    id: string;
  };
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
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
  { label: "Low", value: "LOW" }
];

const visibilityOptions = [
  { label: "Team task", value: "TEAM" },
  { label: "Private task", value: "PRIVATE" }
];

const emptyForm = {
  machineId: "",
  title: "",
  taskType: "MACHINE_MAINTENANCE",
  visibility: "TEAM",
  priority: "NORMAL",
  scheduledStartAt: "",
  scheduledEndAt: "",
  description: "",
  notifyRecipientName: "",
  notifyRecipientPhone: "",
  notifyRecipientEmail: "",
  internalRemarks: ""
};

export function NewTaskPage() {
  const router = useRouter();
  const [user] = useState<AuthUser | null>(() => getAuthUser());
  const [machines, setMachines] = useState<Machine[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [notifyUser, setNotifyUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMachine = useMemo(() => {
    return machines.find((machine) => machine.id === form.machineId);
  }, [machines, form.machineId]);

  const isPrivateTask = form.visibility === "PRIVATE";

  useEffect(() => {
    void loadForm();
  }, []);

  async function loadForm() {
    setLoading(true);
    setError(null);

    try {
      const [machineResponse, technicianResponse] = await Promise.all([
        apiRequest<MachineListResponse>("/api/machines?isActive=true&page=1&pageSize=100"),
        apiRequest<TechnicianListResponse>("/api/tickets/technicians")
      ]);

      setMachines(machineResponse.data);
      setTechnicians(technicianResponse.data);
      setSelectedTechnicianIds(user && ["SUPERVISOR", "TECHNICIAN"].includes(user.role) ? [user.id] : []);
      setForm((current) => ({
        ...current,
        machineId: current.machineId || machineResponse.data[0]?.id || ""
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load task form.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await apiRequest<TaskResponse>("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          machineId: form.machineId,
          title: form.title,
          taskType: form.taskType,
          visibility: form.visibility,
          priority: form.priority,
          scheduledStartAt: form.scheduledStartAt ? new Date(form.scheduledStartAt).toISOString() : null,
          scheduledEndAt: form.scheduledEndAt ? new Date(form.scheduledEndAt).toISOString() : null,
          description: form.description || null,
          notifyUser: !isPrivateTask && notifyUser,
          notifyRecipientName: !isPrivateTask && notifyUser ? form.notifyRecipientName || null : null,
          notifyRecipientPhone: !isPrivateTask && notifyUser ? form.notifyRecipientPhone || null : null,
          notifyRecipientEmail: !isPrivateTask && notifyUser ? form.notifyRecipientEmail || null : null,
          internalRemarks: form.internalRemarks || null,
          assignedTechnicianIds: selectedTechnicianIds
        })
      });

      router.push(`/technician/tasks/${response.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create task.");
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
              <span>New</span>
            </nav>
            <h1 className="field-title">New task</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link className="field-button-secondary" href="/technician/tasks">
              Back
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <AdminMenu />

        <section className="field-panel mt-5">
          {loading ? <p className="field-muted">Loading...</p> : null}
          {error ? <div className="field-alert-error">{error}</div> : null}

          {!loading ? (
            <form className="mt-4 grid gap-5" onSubmit={saveTask}>
              <SearchableSingleSelect
                label="Machine"
                value={form.machineId}
                options={machines.map((machine) => ({
                  value: machine.id,
                  label: `${machine.machineName} / ${machine.serialNumber}`,
                  description: `${machine.customer.name} / ${machine.model} / ${machine.location}`
                }))}
                placeholder="Search machine, serial number, customer, or location"
                required
                onChange={(value) => updateField("machineId", value)}
              />

              {selectedMachine ? (
                <div className="field-panel-subtle grid gap-2 text-sm sm:grid-cols-2">
                  <Info label="Customer" value={selectedMachine.customer.name} />
                  <Info label="Machine" value={selectedMachine.machineName} />
                  <Info label="Model" value={selectedMachine.model} />
                  <Info label="Serial No." value={selectedMachine.serialNumber} />
                  <Info label="Location" value={selectedMachine.location} />
                </div>
              ) : null}

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

              <section className="field-panel-subtle grid gap-3">
                <div>
                  <h2 className="field-section-title text-base">Visibility</h2>
                  <p className="field-muted mt-1">Team tasks are visible to staff and can notify users. Private tasks are visible only to you, assigned staff, and admins.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibilityOptions.map((option) => (
                    <button
                      key={option.value}
                      className={`rounded-md border px-4 py-3 text-left text-sm font-semibold transition ${
                        form.visibility === option.value
                          ? "border-[#155e75] bg-[#e0f2fe] text-[#075985] dark:border-[#22d3ee] dark:bg-[#0c4a6e] dark:text-[#bae6fd]"
                          : "border-[#d9dee3] text-[#3c4043] hover:border-[#155e75] dark:border-[#2f3742] dark:text-[#d7dde4] dark:hover:border-[#22d3ee]"
                      }`}
                      type="button"
                      onClick={() => updateField("visibility", option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-3">
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
                <TextInput label="End Time" type="datetime-local" value={form.scheduledEndAt} onChange={(value) => updateField("scheduledEndAt", value)} />
              </div>

              <TextAreaInput label="Description" value={form.description} onChange={(value) => updateField("description", value)} />

              {!isPrivateTask ? (
                <section className="field-panel-subtle grid gap-4">
                  <label className="flex items-start gap-3">
                    <input
                      className="mt-1 h-4 w-4 accent-[#155e75]"
                      type="checkbox"
                      checked={notifyUser}
                      onChange={(event) => setNotifyUser(event.target.checked)}
                    />
                    <span>
                      <span className="block text-sm font-semibold">Notify User</span>
                      <span className="field-muted mt-1 block text-sm">Send a WhatsApp task notification when this task is created.</span>
                    </span>
                  </label>

                  {notifyUser ? (
                    <>
                      <div>
                        <h2 className="field-section-title text-base">User to Notify</h2>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextInput label="Name" value={form.notifyRecipientName} required onChange={(value) => updateField("notifyRecipientName", value)} />
                        <TextInput label="Email" type="email" value={form.notifyRecipientEmail} onChange={(value) => updateField("notifyRecipientEmail", value)} />
                      </div>
                      <PhoneNumberInput
                        label="Phone"
                        value={form.notifyRecipientPhone}
                        required
                        onChange={(value) => updateField("notifyRecipientPhone", value)}
                      />
                    </>
                  ) : null}
                </section>
              ) : null}

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
                <Link className="field-button-secondary" href="/technician/tasks">
                  Cancel
                </Link>
                <button
                  className="field-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                  disabled={
                    saving
                    || !form.machineId
                    || !form.title.trim()
                    || (!isPrivateTask && notifyUser && (!form.notifyRecipientName.trim() || !isValidPhoneNumber(form.notifyRecipientPhone)))
                  }
                >
                  {saving ? "Creating..." : "Create task"}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </section>
    </main>
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
