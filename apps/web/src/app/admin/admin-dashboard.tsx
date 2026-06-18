"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminMenu } from "../../components/admin-menu";
import { ThemeToggle } from "../../components/theme-toggle";
import { apiRequest } from "../../lib/api";

type CustomerListResponse = {
  meta: {
    total: number;
  };
};

type Machine = {
  id: string;
  machineName: string;
  model: string;
  serialNumber: string;
  location: string;
  nextServiceDueAt: string | null;
  isActive: boolean;
  customer: {
    name: string;
  };
};

type MachineListResponse = {
  data: Machine[];
  meta: {
    total: number;
  };
};

type Ticket = {
  id: string;
  ticketNumber: string;
  issueTitle: string;
  priority: string;
  status: string;
  createdAt: string;
  machine: {
    machineName: string;
    serialNumber: string;
    customer: {
      name: string;
    };
  };
};

type TicketListResponse = {
  data: Ticket[];
  meta: {
    total: number;
  };
};

type SettingsResponse = {
  data: {
    reminderWindowDays: number;
  };
};

export function AdminDashboard() {
  const [customerTotal, setCustomerTotal] = useState(0);
  const [machineTotal, setMachineTotal] = useState(0);
  const [openTicketTotal, setOpenTicketTotal] = useState(0);
  const [pendingAcknowledgementTotal, setPendingAcknowledgementTotal] = useState(0);
  const [followUpTotal, setFollowUpTotal] = useState(0);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [reminderWindowDays, setReminderWindowDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [
          customers,
          machineResponse,
          newTickets,
          assignedTickets,
          inProgressTickets,
          waitingPartsTickets,
          waitingRequesterTickets,
          followUpTickets,
          pendingAcknowledgementTickets,
          recentTicketResponse,
          settingsResponse
        ] = await Promise.all([
          apiRequest<CustomerListResponse>("/api/customers?page=1&pageSize=1"),
          apiRequest<MachineListResponse>("/api/machines?page=1&pageSize=100"),
          apiRequest<TicketListResponse>("/api/tickets?status=NEW&page=1&pageSize=1"),
          apiRequest<TicketListResponse>("/api/tickets?status=ASSIGNED&page=1&pageSize=1"),
          apiRequest<TicketListResponse>("/api/tickets?status=IN_PROGRESS&page=1&pageSize=1"),
          apiRequest<TicketListResponse>("/api/tickets?status=WAITING_FOR_PARTS&page=1&pageSize=1"),
          apiRequest<TicketListResponse>("/api/tickets?status=WAITING_FOR_REQUESTER&page=1&pageSize=1"),
          apiRequest<TicketListResponse>("/api/tickets?status=FOLLOW_UP_REQUIRED&page=1&pageSize=1"),
          apiRequest<TicketListResponse>("/api/tickets?status=PENDING_ACKNOWLEDGEMENT&page=1&pageSize=1"),
          apiRequest<TicketListResponse>("/api/tickets?page=1&pageSize=6"),
          apiRequest<SettingsResponse>("/api/settings")
        ]);

        if (!mounted) return;
        setCustomerTotal(customers.meta.total);
        setMachineTotal(machineResponse.meta.total);
        setMachines(machineResponse.data);
        setReminderWindowDays(settingsResponse.data.reminderWindowDays);
        setOpenTicketTotal(
          newTickets.meta.total +
            assignedTickets.meta.total +
            inProgressTickets.meta.total +
            waitingPartsTickets.meta.total +
            waitingRequesterTickets.meta.total +
            followUpTickets.meta.total +
            pendingAcknowledgementTickets.meta.total
        );
        setPendingAcknowledgementTotal(pendingAcknowledgementTickets.meta.total);
        setFollowUpTotal(followUpTickets.meta.total);
        setRecentTickets(recentTicketResponse.data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const dueSoonMachines = useMemo(() => {
    const now = Date.now();
    const soon = now + reminderWindowDays * 24 * 60 * 60 * 1000;
    return machines
      .filter((machine) => {
        if (!machine.nextServiceDueAt) return false;
        const due = new Date(machine.nextServiceDueAt).getTime();
        return due <= soon;
      })
      .sort((a, b) => {
        return new Date(a.nextServiceDueAt ?? 0).getTime() - new Date(b.nextServiceDueAt ?? 0).getTime();
      })
      .slice(0, 6);
  }, [machines, reminderWindowDays]);

  return (
    <main className="field-page">
      <section className="field-shell max-w-7xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">Home</p>
            <h1 className="field-title">Dashboard</h1>
          </div>
          <ThemeToggle />
        </header>

        <AdminMenu />

        {error ? (
          <div className="field-alert-error mt-5">
            {error}
          </div>
        ) : null}

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Metric label="Customers" value={loading ? "..." : customerTotal} />
          <Metric label="Machines" value={loading ? "..." : machineTotal} />
          <Metric label="Open Tickets" value={loading ? "..." : openTicketTotal} />
          <Metric label="Pending Ack" value={loading ? "..." : pendingAcknowledgementTotal} />
          <Metric label="Follow Up" value={loading ? "..." : followUpTotal} />
          <Metric label="Service Due Soon" value={loading ? "..." : dueSoonMachines.length} />
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <AdminLink href="/admin/customers" title="Customers" description="Create and update customer records." />
          <AdminLink href="/admin/machines" title="Machines" description="Create machines, reminders, and QR links." />
          <AdminLink href="/admin/reminders" title="Reminders" description="Track upcoming, due, and overdue service." />
          <AdminLink href="/admin/users" title="Users" description="Manage admin, supervisor, and technician accounts." />
          <AdminLink href="/technician/tickets" title="Ticket Workbench" description="Review open tickets and service reports." />
          <AdminLink href="/admin/audit-logs" title="Audit Logs" description="Review important changes and actors." />
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="field-panel p-0">
            <div className="border-b border-[#d9dee3] p-4 dark:border-[#2f3742]">
              <h2 className="field-section-title">Recent Tickets</h2>
              <p className="field-muted mt-1">
                Latest support activity across all machines
              </p>
            </div>
            <div className="divide-y divide-[#d9dee3] dark:divide-[#2f3742]">
              {loading ? <p className="field-muted p-4">Loading...</p> : null}
              {!loading && recentTickets.length === 0 ? (
                <p className="field-muted p-4">No tickets yet.</p>
              ) : null}
              {recentTickets.map((ticket) => (
                <a
                  key={ticket.id}
                  className="block p-4 transition hover:bg-cyan-50/60 dark:hover:bg-[#1f242d]"
                  href="/technician/tickets"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{ticket.ticketNumber}</p>
                      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{ticket.issueTitle}</p>
                      <p className="mt-1 text-xs text-[#5f6368] dark:text-[#a8b0ba]">
                        {ticket.machine.machineName} / {ticket.machine.serialNumber}
                      </p>
                    </div>
                    <span className={`status-badge ${statusTone(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>

          <section className="field-panel p-0">
            <div className="border-b border-[#d9dee3] p-4 dark:border-[#2f3742]">
              <h2 className="field-section-title">Service Due Soon</h2>
              <p className="field-muted mt-1">
                Machines due or overdue within {reminderWindowDays} days
              </p>
            </div>
            <div className="divide-y divide-[#d9dee3] dark:divide-[#2f3742]">
              {loading ? <p className="field-muted p-4">Loading...</p> : null}
              {!loading && dueSoonMachines.length === 0 ? (
                <p className="field-muted p-4">No machines due soon.</p>
              ) : null}
              {dueSoonMachines.map((machine) => (
                <a
                  key={machine.id}
                  className="block p-4 transition hover:bg-cyan-50/60 dark:hover:bg-[#1f242d]"
                  href={`/machines/${machine.id}/logs`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{machine.machineName}</p>
                      <p className="field-muted mt-1">
                        {machine.customer.name} / {machine.serialNumber}
                      </p>
                    </div>
                    <span className="status-badge status-amber">
                      {machine.nextServiceDueAt ? formatDate(machine.nextServiceDueAt) : "Not set"}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        </div>
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

function AdminLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <a
      className="field-panel transition hover:border-[#155e75] hover:bg-cyan-50/40 dark:hover:border-[#22d3ee] dark:hover:bg-[#1f242d]"
      href={href}
    >
      <h2 className="field-section-title">{title}</h2>
      <p className="field-muted mt-2 leading-6">{description}</p>
    </a>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "ASSIGNED":
      return "status-blue";
    case "IN_PROGRESS":
      return "status-cyan";
    case "WAITING_FOR_REQUESTER":
      return "status-amber";
    case "WAITING_FOR_PARTS":
      return "status-orange";
    case "PENDING_ACKNOWLEDGEMENT":
      return "status-emerald";
    case "FOLLOW_UP_REQUIRED":
      return "status-violet";
    case "RESOLVED":
      return "status-green";
    default:
      return "status-neutral";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}
