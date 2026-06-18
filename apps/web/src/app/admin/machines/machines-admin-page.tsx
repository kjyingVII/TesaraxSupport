"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AdminMenu } from "../../../components/admin-menu";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiRequest } from "../../../lib/api";
import { getAuthUser, type AuthUser } from "../../../lib/auth";

type Machine = {
  id: string;
  machineName: string;
  model: string;
  serialNumber: string;
  location: string;
  qrCodeUrl: string | null;
  serviceReminderIntervalDays: number;
  nextServiceDueAt: string | null;
  isActive: boolean;
  customer: { name: string };
};

type MachineListResponse = { data: Machine[]; meta: { total: number } };

export function MachinesAdminPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user] = useState<AuthUser | null>(() => getAuthUser());
  const canEditMachines = user?.role === "ADMIN" || user?.role === "SUPERVISOR";

  useEffect(() => {
    void loadMachines();
  }, []);

  async function loadMachines(nextSearch = search) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (nextSearch.trim()) params.set("search", nextSearch.trim());

    try {
      const response = await apiRequest<MachineListResponse>(`/api/machines?${params.toString()}`);
      setMachines(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load machines.");
    } finally {
      setLoading(false);
    }
  }

  function searchMachines(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadMachines();
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
              <span>Machines</span>
            </nav>
            <h1 className="field-title">Machines</h1>
          </div>
          <div className="flex items-center gap-3">
            {canEditMachines ? (
              <Link className="field-button-primary min-h-10" href="/admin/machines/new">
                Add Machine
              </Link>
            ) : null}
            <ThemeToggle />
          </div>
        </header>

        <AdminMenu />

        <section className="field-panel mt-5 p-0">
          <div className="border-b border-[#d9dee3] p-4 dark:border-[#2f3742]">
            <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={searchMachines}>
              <input className="field-input mt-0 h-11" value={search} placeholder="Search machines" onChange={(event) => setSearch(event.target.value)} />
              <button className="field-button-secondary" type="submit">Search</button>
            </form>
            <p className="field-muted mt-3">{total} machines found</p>
          </div>

          {error ? <div className="field-alert-error m-4">{error}</div> : null}

          <div className="divide-y divide-[#d9dee3] dark:divide-[#2f3742]">
            {loading ? <p className="field-muted p-4">Loading...</p> : null}
            {!loading && machines.length === 0 ? <p className="field-muted p-4">No machines found.</p> : null}
            {machines.map((machine) => (
              <div key={machine.id} className="grid gap-4 p-4 transition hover:bg-cyan-50/40 dark:hover:bg-[#1f242d] lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{machine.machineName}</p>
                    <span className={`status-badge ${machine.isActive ? "status-green" : "status-neutral"}`}>{machine.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-[#5f6368] dark:text-[#a8b0ba] sm:grid-cols-2 lg:grid-cols-5">
                    <p>{machine.customer.name}</p>
                    <p>{machine.model}</p>
                    <p>{machine.serialNumber}</p>
                    <p>{machine.location}</p>
                    <p>{machine.serviceReminderIntervalDays} day maintenance interval</p>
                  </div>
                  <p className="field-muted mt-2">
                    Next machine maintenance due: {machine.nextServiceDueAt ? new Date(machine.nextServiceDueAt).toLocaleDateString() : "Not set"}
                  </p>
                </div>
                <div className={`grid gap-2 ${canEditMachines ? "sm:grid-cols-3" : "sm:grid-cols-2"} lg:grid-cols-none`}>
                  {canEditMachines ? (
                    <Link className="field-button-secondary" href={`/admin/machines/${machine.id}/edit`}>
                      Edit
                    </Link>
                  ) : null}
                  <Link className="field-button-secondary" href={`/machines/${machine.id}/logs`}>
                    Logs
                  </Link>
                  {machine.qrCodeUrl ? (
                    <Link className="field-button-secondary" href={machine.qrCodeUrl}>
                      QR
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
