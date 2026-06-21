"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AdminMenu } from "../../../components/admin-menu";
import { PhoneNumberInput } from "../../../components/phone-number-input";
import { SearchableMultiSelect } from "../../../components/searchable-combobox";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiRequest } from "../../../lib/api";

type Customer = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  remarks: string | null;
  isActive: boolean;
};

type CustomerResponse = {
  data: Customer;
};

type Technician = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type TechnicianListResponse = {
  data: Technician[];
};

type TechnicianAssignmentResponse = {
  data: Array<{
    technicianId: string;
    technician: Technician;
  }>;
};

const emptyForm = {
  name: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  remarks: ""
};

export function CustomerFormPage({ customerId }: { customerId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(customerId);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [savingTechnicians, setSavingTechnicians] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    void loadCustomer(customerId);
  }, [customerId]);

  async function loadCustomer(id: string) {
    setLoading(true);
    setError(null);

    try {
      const [response, technicianResponse, assignmentResponse] = await Promise.all([
        apiRequest<CustomerResponse>(`/api/customers/${id}`),
        apiRequest<TechnicianListResponse>("/api/tickets/technicians"),
        apiRequest<TechnicianAssignmentResponse>(`/api/customers/${id}/technicians`)
      ]);
      setCustomer(response.data);
      setTechnicians(technicianResponse.data);
      setSelectedTechnicianIds(assignmentResponse.data.map((assignment) => assignment.technicianId));
      setForm({
        name: response.data.name,
        contactName: response.data.contactName ?? "",
        contactEmail: response.data.contactEmail ?? "",
        contactPhone: response.data.contactPhone ?? "",
        address: response.data.address ?? "",
        remarks: response.data.remarks ?? ""
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load customer.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        name: form.name,
        contactName: form.contactName || null,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        address: form.address || null,
        remarks: form.remarks || null
      };

      const response = customerId
        ? await apiRequest<CustomerResponse>(`/api/customers/${customerId}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
          })
        : await apiRequest<CustomerResponse>("/api/customers", {
            method: "POST",
            body: JSON.stringify(payload)
          });

      setCustomer(response.data);
      setMessage(customerId ? "Customer updated." : "Customer created.");
      if (customerId) {
        router.push("/admin/customers");
      } else {
        setForm(emptyForm);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save customer.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateCustomer() {
    if (!customerId) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await apiRequest<CustomerResponse>(`/api/customers/${customerId}/deactivate`, {
        method: "PATCH"
      });
      setCustomer(response.data);
      setMessage("Customer deactivated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to deactivate customer.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTechnicianAssignments() {
    if (!customerId) return;
    setSavingTechnicians(true);
    setError(null);
    setMessage(null);

    try {
      const response = await apiRequest<TechnicianAssignmentResponse>(`/api/customers/${customerId}/technicians`, {
        method: "PATCH",
        body: JSON.stringify({
          technicianIds: selectedTechnicianIds
        })
      });
      setSelectedTechnicianIds(response.data.map((assignment) => assignment.technicianId));
      setMessage("Customer technicians updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save customer technicians.");
    } finally {
      setSavingTechnicians(false);
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
              <Link className="field-link" href="/admin/customers">
                Customers
              </Link>
              <span>/</span>
              <span>{customerId ? "Edit" : "Add"}</span>
            </nav>
            <h1 className="field-title">{customerId ? "Edit Customer" : "Add Customer"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link className="field-button-secondary" href="/admin/customers">
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
            <form className="mt-4 grid gap-4" onSubmit={saveCustomer}>
              <TextInput label="Name" value={form.name} required onChange={(value) => updateField("name", value)} />
              <TextInput label="Contact Name" value={form.contactName} onChange={(value) => updateField("contactName", value)} />
              <TextInput label="Contact Email" type="email" value={form.contactEmail} onChange={(value) => updateField("contactEmail", value)} />
              <PhoneNumberInput label="Contact Phone" value={form.contactPhone} onChange={(value) => updateField("contactPhone", value)} />
              <TextAreaInput label="Address" value={form.address} onChange={(value) => updateField("address", value)} />
              <TextAreaInput label="Remarks" value={form.remarks} onChange={(value) => updateField("remarks", value)} />
              <button className="field-button-primary disabled:opacity-50" type="submit" disabled={saving || !form.name.trim()}>
                {saving ? "Saving..." : "Save Customer"}
              </button>
            </form>
          ) : null}

          {customerId && customer?.isActive ? (
            <button className="mt-3 h-11 w-full rounded-md border border-red-300 px-4 text-sm font-medium text-red-700 disabled:opacity-50 dark:border-red-800 dark:text-red-300" type="button" disabled={saving} onClick={deactivateCustomer}>
              Deactivate Customer
            </button>
          ) : null}
        </section>

        {customerId && !loading ? (
          <section className="field-panel mt-5">
            <h2 className="field-section-title">Customer Technicians</h2>
            <p className="field-muted mt-2">
              These technicians will be notified when a ticket is lodged for any machine under this customer.
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
              {savingTechnicians ? "Saving..." : "Save Customer Technicians"}
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
