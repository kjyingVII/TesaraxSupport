"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AdminMenu } from "../../../components/admin-menu";
import { SearchableMultiSelect, SearchableSingleSelect } from "../../../components/searchable-combobox";
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
  supportCompanyName: string | null;
  qrCodeUrl: string | null;
  serviceReminderIntervalDays: number;
  nextServiceDueAt: string | null;
  internalRemarks: string | null;
  isActive: boolean;
  hasMachineAccessPassword: boolean;
  supportCompanyLogoAttachment: {
    id: string;
    originalFileName: string;
    contentType: string;
    fileSizeBytes: number;
    createdAt: string;
  } | null;
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
  supportCompanyName: "",
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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [deletingLogo, setDeletingLogo] = useState(false);
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
          supportCompanyName: machineResponse.data.supportCompanyName ?? "",
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
        supportCompanyName: string | null;
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
        supportCompanyName: form.supportCompanyName || null,
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

  async function uploadSupportCompanyLogo() {
    if (!machineId || !logoFile) return;

    setUploadingLogo(true);
    setError(null);
    setMessage(null);

    try {
      if (!logoFile.type.startsWith("image/")) {
        throw new Error("Support company logo must be an image file.");
      }
      if (logoFile.size > 2 * 1024 * 1024) {
        throw new Error("Support company logo must be 2 MB or smaller.");
      }

      const response = await apiRequest<{
        data: Machine["supportCompanyLogoAttachment"];
      }>(`/api/machines/${machineId}/support-company-logo`, {
        method: "POST",
        body: JSON.stringify({
          originalFileName: logoFile.name,
          contentType: logoFile.type || "application/octet-stream",
          dataBase64: await readFileAsDataUrl(logoFile)
        })
      });

      setMachine((current) => current ? { ...current, supportCompanyLogoAttachment: response.data } : current);
      setLogoFile(null);
      setMessage("Support company logo uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload support company logo.");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function deleteSupportCompanyLogo() {
    if (!machineId || !machine?.supportCompanyLogoAttachment) return;

    const confirmed = window.confirm("Remove the support company logo from this machine?");
    if (!confirmed) return;

    setDeletingLogo(true);
    setError(null);
    setMessage(null);

    try {
      await apiRequest(`/api/machines/${machineId}/support-company-logo`, {
        method: "DELETE"
      });
      setMachine((current) => current ? { ...current, supportCompanyLogoAttachment: null } : current);
      setLogoFile(null);
      setMessage("Support company logo removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove support company logo.");
    } finally {
      setDeletingLogo(false);
    }
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
              <SearchableSingleSelect
                label="Customer"
                value={form.customerId}
                options={customers.map((customer) => ({
                  value: customer.id,
                  label: customer.name,
                  description: customer.isActive ? "Active" : "Inactive"
                }))}
                placeholder="Search customer"
                required
                onChange={(value) => updateField("customerId", value)}
              />
              <TextInput label="Machine Name" value={form.machineName} required onChange={(value) => updateField("machineName", value)} />
              <TextInput label="Model" value={form.model} required onChange={(value) => updateField("model", value)} />
              <TextInput label="Serial Number" value={form.serialNumber} required onChange={(value) => updateField("serialNumber", value)} />
              <TextInput label="Location" value={form.location} required onChange={(value) => updateField("location", value)} />
              <TextInput label="Support Company Name" value={form.supportCompanyName} onChange={(value) => updateField("supportCompanyName", value)} />
              {isEdit ? (
                <div className="field-panel-subtle">
                  <p className="field-meta-label">Support Company Logo</p>
                  <p className="field-muted mt-1">
                    {machine?.supportCompanyLogoAttachment
                      ? `Current logo: ${machine.supportCompanyLogoAttachment.originalFileName}`
                      : "No support company logo uploaded."}
                  </p>
                  <div className="mt-3 grid gap-3">
                    <input
                      className="field-input min-h-11 py-2"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="field-button-secondary disabled:opacity-50"
                        type="button"
                        disabled={uploadingLogo || !logoFile}
                        onClick={uploadSupportCompanyLogo}
                      >
                        {uploadingLogo ? "Uploading..." : "Upload Logo"}
                      </button>
                      {machine?.supportCompanyLogoAttachment ? (
                        <button
                          className="min-h-11 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 transition hover:border-red-400 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/40"
                          type="button"
                          disabled={deletingLogo}
                          onClick={deleteSupportCompanyLogo}
                        >
                          {deletingLogo ? "Removing..." : "Delete Logo"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
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
            <SearchableMultiSelect
              label="Technicians"
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}
