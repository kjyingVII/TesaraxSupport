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
        const machineResponse = await apiRequest<MachineResponse>(`/api/machines/${machineId}`);
        setMachine(machineResponse.data);
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
      </section>
    </main>
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
