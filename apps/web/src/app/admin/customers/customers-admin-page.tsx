"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AdminMenu } from "../../../components/admin-menu";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiRequest } from "../../../lib/api";

type Customer = {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  isActive: boolean;
  _count?: {
    machines: number;
  };
};

type CustomerListResponse = {
  data: Customer[];
  meta: {
    total: number;
  };
};

export function CustomersAdminPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function loadCustomers(nextSearch = search) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (nextSearch.trim()) params.set("search", nextSearch.trim());

    try {
      const response = await apiRequest<CustomerListResponse>(`/api/customers?${params.toString()}`);
      setCustomers(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }

  function searchCustomers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadCustomers();
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
              <span>Customers</span>
            </nav>
            <h1 className="field-title">Customers</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link className="field-button-primary min-h-10" href="/admin/customers/new">
              Add Customer
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <AdminMenu />

        <section className="field-panel mt-5 p-0">
          <div className="border-b border-[#d9dee3] p-4 dark:border-[#2f3742]">
            <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={searchCustomers}>
              <input
                className="field-input mt-0 h-11"
                value={search}
                placeholder="Search customers"
                onChange={(event) => setSearch(event.target.value)}
              />
              <button className="field-button-secondary" type="submit">
                Search
              </button>
            </form>
            <p className="field-muted mt-3">{total} customers found</p>
          </div>

          {error ? <div className="field-alert-error m-4">{error}</div> : null}

          <div className="divide-y divide-[#d9dee3] dark:divide-[#2f3742]">
            {loading ? <p className="field-muted p-4">Loading...</p> : null}
            {!loading && customers.length === 0 ? <p className="field-muted p-4">No customers found.</p> : null}
            {customers.map((customer) => (
              <div key={customer.id} className="grid gap-4 p-4 transition hover:bg-cyan-50/40 dark:hover:bg-[#1f242d] md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{customer.name}</p>
                    <span className={`status-badge ${customer.isActive ? "status-green" : "status-neutral"}`}>
                      {customer.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-[#5f6368] dark:text-[#a8b0ba] sm:grid-cols-2 lg:grid-cols-4">
                    <p>{customer.contactName || "No contact name"}</p>
                    <p>{customer.contactEmail || "No email"}</p>
                    <p>{customer.contactPhone || "No phone"}</p>
                    <p>{customer._count?.machines ?? 0} machines</p>
                  </div>
                  {customer.address ? <p className="field-muted mt-2">{customer.address}</p> : null}
                </div>
                <Link className="field-button-secondary" href={`/admin/customers/${customer.id}/edit`}>
                  Edit
                </Link>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
