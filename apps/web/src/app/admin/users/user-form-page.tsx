"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
};

type UserResponse = {
  data: User;
};

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  role: "TECHNICIAN" as UserRole,
  isActive: "true",
  password: ""
};

export function UserFormPage({ userId }: { userId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(userId);
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    void loadUser(userId);
  }, [userId]);

  async function loadUser(id: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<UserResponse>(`/api/admin/users/${id}`);
      setUser(response.data);
      setForm({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone ?? "",
        role: response.data.role,
        isActive: response.data.isActive ? "true" : "false",
        password: ""
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load user.");
    } finally {
      setLoading(false);
    }
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        role: form.role,
        isActive: form.isActive === "true"
      };

      if (userId) {
        await apiRequest<UserResponse>(`/api/admin/users/${userId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        router.push("/admin/users");
        return;
      }

      await apiRequest<UserResponse>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          password: form.password
        })
      });
      setMessage("User created.");
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save user.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    setResetting(true);
    setError(null);
    setPasswordMessage(null);

    try {
      await apiRequest<UserResponse>(`/api/admin/users/${userId}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password: newPassword })
      });
      setNewPassword("");
      setPasswordMessage("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset password.");
    } finally {
      setResetting(false);
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
              <Link className="field-link" href="/admin/users">
                Users
              </Link>
              <span>/</span>
              <span>{isEdit ? "Edit" : "Add"}</span>
            </nav>
            <h1 className="field-title">{isEdit ? "Edit User" : "Add User"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link className="field-button-secondary" href="/admin/users">
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
            <form className="mt-4 grid gap-4" onSubmit={saveUser}>
              <TextInput label="Name" value={form.name} required onChange={(value) => updateField("name", value)} />
              <TextInput label="Email" type="email" value={form.email} required onChange={(value) => updateField("email", value)} />
              <TextInput label="Phone" value={form.phone} onChange={(value) => updateField("phone", value)} />
              <label className="block">
                <span className="field-label">Role</span>
                <select className="field-input h-11" value={form.role} onChange={(event) => updateField("role", event.target.value)}>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="TECHNICIAN">Technician</option>
                </select>
              </label>
              <label className="block">
                <span className="field-label">Status</span>
                <select className="field-input h-11" value={form.isActive} onChange={(event) => updateField("isActive", event.target.value)}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              {!isEdit ? <TextInput label="Password" type="password" value={form.password} required onChange={(value) => updateField("password", value)} /> : null}
              <button className="field-button-primary disabled:opacity-50" type="submit" disabled={saving || !form.name.trim() || !form.email.trim() || (!isEdit && form.password.length < 8)}>
                {saving ? "Saving..." : "Save User"}
              </button>
            </form>
          ) : null}
        </section>

        {user ? (
          <section className="field-panel mt-5">
            <h2 className="field-section-title">Reset Password</h2>
            <p className="field-muted mt-1">{user.email}</p>
            {passwordMessage ? <div className="field-alert-success mt-4 p-3 text-sm">{passwordMessage}</div> : null}
            <form className="mt-4 grid gap-4" onSubmit={resetPassword}>
              <TextInput label="New Password" type="password" value={newPassword} required onChange={setNewPassword} />
              <button className="field-button-secondary disabled:opacity-50" type="submit" disabled={resetting || newPassword.length < 8}>
                {resetting ? "Updating..." : "Update Password"}
              </button>
            </form>
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
