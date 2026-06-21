"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AdminMenu } from "../../../components/admin-menu";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiRequest } from "../../../lib/api";

type Customer = { id: string; name: string; isActive: boolean };

type Machine = {
  id: string;
  customerId: string;
  machineName: string;
  model: string;
  serialNumber: string;
  location: string;
  qrCodeUrl: string | null;
  serviceReminderIntervalDays: number;
  nextServiceDueAt: string | null;
  internalRemarks: string | null;
  isActive: boolean;
  hasMachineAccessPassword: boolean;
};

type MachineResponse = { data: Machine };
type CustomerListResponse = { data: Customer[] };
type Technician = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};
type TechnicianListResponse = { data: Technician[] };
type TechnicianAssignmentResponse = {
  data: Array<{
    technicianId: string;
    technician: Technician;
  }>;
};
type SettingsResponse = {
  data: {
    defaultServiceReminderIntervalDays: number;
  };
};

const emptyForm = {
  customerId: "",
  machineName: "",
  model: "",
  serialNumber: "",
  location: "",
  serviceReminderIntervalDays: "90",
  nextServiceDueAt: "",
  internalRemarks: "",
  machineAccessPassword: ""
};

export function MachineFormPage({ machineId }: { machineId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(machineId);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [defaultReminderIntervalDays, setDefaultReminderIntervalDays] = useState(90);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTechnicians, setSavingTechnicians] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadPage();
  }, [machineId]);

  async function loadPage() {
    setLoading(true);
    setError(null);

    try {
      const [customerResponse, settingsResponse] = await Promise.all([
        apiRequest<CustomerListResponse>("/api/customers?isActive=true&page=1&pageSize=100"),
        apiRequest<SettingsResponse>("/api/settings")
      ]);
      setCustomers(customerResponse.data);
      setDefaultReminderIntervalDays(settingsResponse.data.defaultServiceReminderIntervalDays);

      if (machineId) {
        const [machineResponse, technicianResponse, assignmentResponse] = await Promise.all([
          apiRequest<MachineResponse>(`/api/machines/${machineId}`),
          apiRequest<TechnicianListResponse>("/api/tickets/technicians"),
          apiRequest<TechnicianAssignmentResponse>(`/api/machines/${machineId}/technicians`)
        ]);
        setMachine(machineResponse.data);
        setTechnicians(technicianResponse.data);
        setSelectedTechnicianIds(assignmentResponse.data.map((assignment) => assignment.technicianId));
        setForm({
          customerId: machineResponse.data.customerId,
          machineName: machineResponse.data.machineName,
          model: machineResponse.data.model,
          serialNumber: machineResponse.data.serialNumber,
          location: machineResponse.data.location,
          serviceReminderIntervalDays: String(machineResponse.data.serviceReminderIntervalDays),
          nextServiceDueAt: machineResponse.data.nextServiceDueAt ? toDateTimeLocal(machineResponse.data.nextServiceDueAt) : "",
          internalRemarks: machineResponse.data.internalRemarks ?? "",
          machineAccessPassword: ""
        });
      } else {
        setForm((current) => ({
          ...current,
          customerId: current.customerId || customerResponse.data[0]?.id || "",
          serviceReminderIntervalDays: String(settingsResponse.data.defaultServiceReminderIntervalDays)
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load machine form.");
    } finally {
      setLoading(false);
    }
  }

  async function saveMachine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload: {
        customerId: string;
        machineName: string;
        model: string;
        serialNumber: string;
        location: string;
        serviceReminderIntervalDays: number;
        nextServiceDueAt: string | null;
        internalRemarks: string | null;
        machineAccessPassword?: string;
      } = {
        customerId: form.customerId,
        machineName: form.machineName,
        model: form.model,
        serialNumber: form.serialNumber,
        location: form.location,
        serviceReminderIntervalDays: Number(form.serviceReminderIntervalDays),
        nextServiceDueAt: form.nextServiceDueAt ? new Date(form.nextServiceDueAt).toISOString() : null,
        internalRemarks: form.internalRemarks || null
      };

      if (form.machineAccessPassword.trim()) {
        payload.machineAccessPassword = form.machineAccessPassword;
      }

      const response = machineId
        ? await apiRequest<MachineResponse>(`/api/machines/${machineId}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
          })
        : await apiRequest<MachineResponse>("/api/machines", {
            method: "POST",
            body: JSON.stringify({
              ...payload,
              nextServiceDueAt: payload.nextServiceDueAt || undefined,
              internalRemarks: form.internalRemarks || undefined
            })
          });

      setMachine(response.data);
      setMessage(machineId ? "Machine updated." : "Machine created.");
      if (machineId) {
        router.push("/admin/machines");
      } else {
        setForm({
          ...emptyForm,
          customerId: customers[0]?.id ?? "",
          serviceReminderIntervalDays: String(defaultReminderIntervalDays)
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save machine.");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveTechnicianAssignments() {
    if (!machineId) return;
    setSavingTechnicians(true);
    setError(null);
    setMessage(null);

    try {
      const response = await apiRequest<TechnicianAssignmentResponse>(`/api/machines/${machineId}/technicians`, {
        method: "PATCH",
        body: JSON.stringify({
          technicianIds: selectedTechnicianIds
        })
      });
      setSelectedTechnicianIds(response.data.map((assignment) => assignment.technicianId));
      setMessage("Machine technicians updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save machine technicians.");
    } finally {
      setSavingTechnicians(false);
    }
  }

  function toggleTechnician(technicianId: string) {
    setSelectedTechnicianIds((current) =>
      current.includes(technicianId)
        ? current.filter((id) => id !== technicianId)
        : [...current, technicianId]
    );
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-3xl">
        <header className="field-header">
          <div>
            <nav className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[#5f6368] dark:text-[#a8b0ba]">
              <Link className="field-link" href="/admin">
                Home
              </Link>
              <span>/</span>
              <Link className="field-link" href="/admin/machines">
                Machines
              </Link>
              <span>/</span>
              <span>{isEdit ? "Edit" : "Add"}</span>
            </nav>
            <h1 className="field-title">{isEdit ? "Edit Machine" : "Add Machine"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link className="field-button-secondary" href="/admin/machines">
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

          {!loading ? (
            <form className="mt-4 grid gap-4" onSubmit={saveMachine}>
              <label className="block">
                <span className="field-label">Customer</span>
                <select className="field-input h-11" value={form.customerId} required onChange={(event) => updateField("customerId", event.target.value)}>
                  <option value="">Select customer</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                </select>
              </label>
              <TextInput label="Machine Name" value={form.machineName} required onChange={(value) => updateField("machineName", value)} />
              <TextInput label="Model" value={form.model} required onChange={(value) => updateField("model", value)} />
              <TextInput label="Serial Number" value={form.serialNumber} required onChange={(value) => updateField("serialNumber", value)} />
              <TextInput label="Location" value={form.location} required onChange={(value) => updateField("location", value)} />
              <TextInput label="Machine Maintenance Interval Days" type="number" value={form.serviceReminderIntervalDays} required onChange={(value) => updateField("serviceReminderIntervalDays", value)} />
              <TextInput label="Next Machine Maintenance Due" type="datetime-local" value={form.nextServiceDueAt} onChange={(value) => updateField("nextServiceDueAt", value)} />
              <TextInput label={isEdit ? "New Machine Access Password" : "Machine Access Password"} type="password" value={form.machineAccessPassword} required={!isEdit} onChange={(value) => updateField("machineAccessPassword", value)} />
              {isEdit ? (
                <p className="field-muted">
                  {machine?.hasMachineAccessPassword ? "Password is set. Leave blank to keep current password." : "No password is set yet. Add one before using the QR access page."}
                </p>
              ) : null}
              <TextAreaInput label="Internal Remarks" value={form.internalRemarks} onChange={(value) => updateField("internalRemarks", value)} />
              <button className="field-button-primary disabled:opacity-50" type="submit" disabled={saving || !form.customerId || !form.machineName.trim()}>
                {saving ? "Saving..." : "Save Machine"}
              </button>
            </form>
          ) : null}

          {machine ? (
            <div className="mt-5 grid gap-3">
              <Link className="field-button-secondary" href={`/machines/${machine.id}/logs`}>Open Full Machine Log</Link>
              {machine.qrCodeUrl ? <Link className="field-button-secondary" href={machine.qrCodeUrl}>Open QR Request Link</Link> : null}
              {machine.qrCodeUrl ? <p className="break-all rounded-md bg-[#eef3f6] p-3 text-xs text-neutral-700 dark:bg-[#0f1115] dark:text-neutral-200">{machine.qrCodeUrl}</p> : null}
            </div>
          ) : null}
        </section>

        {machineId && !loading ? (
          <section className="field-panel mt-5">
            <h2 className="field-section-title">Machine Technicians</h2>
            <p className="field-muted mt-2">
              These technicians will be notified when a ticket is lodged for this machine.
            </p>
            <TechnicianCheckboxList
              technicians={technicians}
              selectedIds={selectedTechnicianIds}
              onToggle={toggleTechnician}
            />
            <button
              className="field-button-primary mt-4 disabled:opacity-50"
              type="button"
              disabled={savingTechnicians}
              onClick={saveTechnicianAssignments}
            >
              {savingTechnicians ? "Saving..." : "Save Machine Technicians"}
            </button>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function TechnicianCheckboxList({
  technicians,
  selectedIds,
  onToggle
}: {
  technicians: Technician[];
  selectedIds: string[];
  onToggle: (technicianId: string) => void;
}) {
  if (technicians.length === 0) {
    return <p className="field-muted mt-4">No active technicians found.</p>;
  }

  return (
    <div className="mt-4 grid gap-2">
      {technicians.map((technician) => (
        <label key={technician.id} className="flex items-start gap-3 rounded-md border border-[#d9dee3] bg-[#fbfcfd] p-3 text-sm dark:border-[#2f3742] dark:bg-[#1f242d]">
          <input
            className="mt-1 h-4 w-4"
            type="checkbox"
            checked={selectedIds.includes(technician.id)}
            onChange={() => onToggle(technician.id)}
          />
          <span>
            <span className="font-medium">{technician.name}</span>
            <span className="field-muted mt-1 block">
              {technician.email}{technician.phone ? ` / ${technician.phone}` : ""}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function TextInput({ label, value, onChange, required, type = "text" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
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
