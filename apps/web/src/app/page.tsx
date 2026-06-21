"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "../components/theme-toggle";
import { clearAuthSession, getAuthUser, type AuthUser } from "../lib/auth";

type HomeLink = {
  href: string;
  title: string;
  description: string;
  roles?: string[];
};

const quickLinks: HomeLink[] = [
  {
    href: "/admin",
    title: "Admin Dashboard",
    description: "Overview of customers, machines, tickets, and maintenance reminders.",
    roles: ["ADMIN", "SUPERVISOR"]
  },
  {
    href: "/technician/tickets",
    title: "Ticket Workbench",
    description: "Review tickets, submit service reports, and send acknowledgement links.",
    roles: ["ADMIN", "SUPERVISOR", "TECHNICIAN"]
  },
  {
    href: "/admin/customers",
    title: "Customers",
    description: "Manage customer records and contact details.",
    roles: ["ADMIN", "SUPERVISOR"]
  },
  {
    href: "/admin/machines",
    title: "Machines",
    description: "Manage machines, QR access, maintenance dates, and manuals.",
    roles: ["ADMIN", "SUPERVISOR", "TECHNICIAN"]
  },
  {
    href: "/admin/users",
    title: "Users",
    description: "Create and maintain staff accounts.",
    roles: ["ADMIN", "SUPERVISOR"]
  },
  {
    href: "/admin/settings",
    title: "Settings",
    description: "Configure attachment limits and system defaults.",
    roles: ["ADMIN", "SUPERVISOR"]
  },
  {
    href: "/profile",
    title: "My Profile",
    description: "Update your contact details or change password.",
    roles: ["ADMIN", "SUPERVISOR", "TECHNICIAN"]
  }
];

export default function HomePage() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getAuthUser());
  }, []);

  const visibleLinks = quickLinks.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  function logout() {
    clearAuthSession();
    setUser(null);
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-6xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">Tesarax Support System</p>
            <h1 className="field-title">Machine Service Desk</h1>
          </div>
          <ThemeToggle />
        </header>

        <section className="field-panel mt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Service requests, reports, machine logs, and acknowledgements</h2>
              <p className="field-muted mt-2 max-w-3xl leading-6">
                Staff can manage tickets, submit service reports, maintain machine history, and track customer acknowledgement from one workspace.
              </p>
              {user ? (
                <p className="field-muted mt-3">
                  Signed in as <span className="font-medium text-neutral-900 dark:text-neutral-100">{user.name}</span> / {user.role}
                </p>
              ) : (
                <p className="field-muted mt-3">Sign in to continue to your workspace.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {user ? (
                <button className="field-button-secondary" type="button" onClick={logout}>
                  Logout
                </button>
              ) : (
                <Link className="field-button-primary" href="/login">
                  Login
                </Link>
              )}
            </div>
          </div>
        </section>

        {user ? (
          <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleLinks.map((item) => (
              <Link
                key={item.href}
                className="field-panel transition hover:border-[#155e75] hover:bg-cyan-50/40 dark:hover:border-[#22d3ee] dark:hover:bg-[#1f242d]"
                href={item.href}
              >
                <h2 className="field-section-title">{item.title}</h2>
                <p className="field-muted mt-2 leading-6">{item.description}</p>
              </Link>
            ))}
          </section>
        ) : (
          <section className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="field-panel">
              <h2 className="field-section-title">Staff Access</h2>
              <p className="field-muted mt-2 leading-6">
                Administrators, supervisors, and technicians sign in to manage service operations.
              </p>
              <Link className="field-button-primary mt-4" href="/login">
                Login
              </Link>
            </div>
            <div className="field-panel">
              <h2 className="field-section-title">Requester Access</h2>
              <p className="field-muted mt-2 leading-6">
                Requesters access machine information and tickets by scanning the QR code on the machine.
              </p>
            </div>
          </section>
        )}

        <footer className="mt-8 text-sm text-[#5f6368] dark:text-[#a8b0ba]">
          <Link className="field-link" href="/privacy">
            Privacy Policy
          </Link>
        </footer>
      </section>
    </main>
  );
}
