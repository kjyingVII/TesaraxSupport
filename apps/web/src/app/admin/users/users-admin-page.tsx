"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AdminMenu } from "../../../components/admin-menu";
import { ThemeToggle } from "../../../components/theme-toggle";
import { apiRequest } from "../../../lib/api";

type UserRole = "ADMIN" | "SUPERVISOR" | "TECHNICIAN";

type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type UserListResponse = {
  data: User[];
  meta: {
    total: number;
  };
};

export function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [isActive, setIsActive] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers(nextSearch = search) {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: "1", pageSize: "50" });
    if (nextSearch.trim()) params.set("search", nextSearch.trim());
    if (role) params.set("role", role);
    if (isActive) params.set("isActive", isActive);

    try {
      const response = await apiRequest<UserListResponse>(`/api/admin/users?${params.toString()}`);
      setUsers(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  function searchUsers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadUsers();
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
              <span>Users</span>
            </nav>
            <h1 className="field-title">Users</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link className="field-button-primary min-h-10" href="/admin/users/new">
              Add User
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <AdminMenu />

        <section className="field-panel mt-5 p-0">
          <div className="border-b border-[#d9dee3] p-4 dark:border-[#2f3742]">
            <form className="grid gap-3 lg:grid-cols-[1fr_180px_160px_auto]" onSubmit={searchUsers}>
              <input className="field-input mt-0 h-11" value={search} placeholder="Search users" onChange={(event) => setSearch(event.target.value)} />
              <select className="field-input mt-0 h-11" value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="">All roles</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="TECHNICIAN">Technician</option>
              </select>
              <select className="field-input mt-0 h-11" value={isActive} onChange={(event) => setIsActive(event.target.value)}>
                <option value="">All status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <button className="field-button-secondary" type="submit">Search</button>
            </form>
            <p className="field-muted mt-3">{total} users found</p>
          </div>

          {error ? <div className="field-alert-error m-4">{error}</div> : null}

          <div className="divide-y divide-[#d9dee3] dark:divide-[#2f3742]">
            {loading ? <p className="field-muted p-4">Loading...</p> : null}
            {!loading && users.length === 0 ? <p className="field-muted p-4">No users found.</p> : null}
            {users.map((user) => (
              <div key={user.id} className="grid gap-4 p-4 transition hover:bg-cyan-50/40 dark:hover:bg-[#1f242d] lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{user.name}</p>
                    <span className="status-badge status-blue">{user.role}</span>
                    <span className={`status-badge ${user.isActive ? "status-green" : "status-neutral"}`}>{user.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-[#5f6368] dark:text-[#a8b0ba] sm:grid-cols-2 lg:grid-cols-4">
                    <p>{user.email}</p>
                    <p>{user.phone || "No phone"}</p>
                    <p>Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}</p>
                    <p>Created: {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <Link className="field-button-secondary" href={`/admin/users/${user.id}/edit`}>
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
