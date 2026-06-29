"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { getAuthUser, type AuthUser } from "../lib/auth";
import { LogoutButton } from "./logout-button";

const menuItems = [
  { href: "/admin/customers", label: "Customers", roles: ["ADMIN", "SUPERVISOR"] },
  { href: "/admin/machines", label: "Machines", roles: ["ADMIN", "SUPERVISOR", "TECHNICIAN"] },
  { href: "/admin/reminders", label: "Reminders", roles: ["ADMIN", "SUPERVISOR"] },
  { href: "/admin/notifications", label: "Notifications", roles: ["ADMIN", "SUPERVISOR"] },
  { href: "/admin/users", label: "Users", roles: ["ADMIN"] },
  { href: "/technician/dashboard", label: "Dashboard", roles: ["ADMIN", "SUPERVISOR", "TECHNICIAN"] },
  { href: "/technician/tickets", label: "Tickets", roles: ["ADMIN", "SUPERVISOR", "TECHNICIAN"] },
  { href: "/technician/tasks", label: "Tasks", roles: ["ADMIN", "SUPERVISOR", "TECHNICIAN"] },
  { href: "/admin/settings", label: "Settings", roles: ["ADMIN", "SUPERVISOR"] },
  { href: "/profile", label: "Profile", roles: ["ADMIN", "SUPERVISOR", "TECHNICIAN"] }
];

export function AdminMenu() {
  const pathname = usePathname();
  const [user] = useState<AuthUser | null>(() => getAuthUser());

  const visibleMenuItems = menuItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <nav className="field-panel mt-5 overflow-x-auto p-2" aria-label="Admin navigation">
      <div className="flex min-w-max items-center gap-2">
        {visibleMenuItems.map((item) => {
          const active = item.href === "/technician/tickets"
            ? pathname.startsWith("/technician/tickets")
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              className={`grid h-10 place-items-center rounded-md px-4 text-sm font-medium transition ${
                active
                  ? "bg-[#155e75] text-white dark:bg-[#22d3ee] dark:text-[#082f49]"
                  : "text-[#5f6368] hover:bg-cyan-50 hover:text-[#155e75] dark:text-[#a8b0ba] dark:hover:bg-[#1f242d] dark:hover:text-[#67e8f9]"
              }`}
              href={item.href}
            >
              {item.label}
            </Link>
          );
        })}
        <div className="h-6 w-px bg-[#d9dee3] dark:bg-[#2f3742]" />
        <LogoutButton />
      </div>
    </nav>
  );
}
