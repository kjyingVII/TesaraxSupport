"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminMenu } from "../../components/admin-menu";
import { PhoneNumberInput } from "../../components/phone-number-input";
import { ThemeToggle } from "../../components/theme-toggle";
import { apiRequest } from "../../lib/api";
import { setAuthSession, getAccessToken, type AuthUser } from "../../lib/auth";

type ProfileResponse = {
  data: AuthUser & {
    phone: string | null;
    isActive: boolean;
    lastLoginAt: string | null;
  };
};

const emptyProfile = {
  name: "",
  email: "",
  phone: ""
};

const emptyPassword = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
};

export function ProfilePage() {
  const [profile, setProfile] = useState(emptyProfile);
  const [password, setPassword] = useState(emptyPassword);
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiRequest<ProfileResponse>("/api/profile");
      setProfile({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone ?? ""
      });
      setUserRole(response.data.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setError(null);
    setMessage(null);

    try {
      const response = await apiRequest<ProfileResponse>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          phone: profile.phone || null
        })
      });
      const token = getAccessToken();
      if (token) {
        setAuthSession(token, {
          id: response.data.id,
          name: response.data.name,
          email: response.data.email,
          phone: response.data.phone,
          role: response.data.role
        });
      }
      setProfile({
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone ?? ""
      });
      setUserRole(response.data.role);
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPassword(true);
    setError(null);
    setMessage(null);

    try {
      if (password.newPassword !== password.confirmPassword) {
        throw new Error("New password and confirmation do not match.");
      }

      await apiRequest("/api/profile/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: password.currentPassword,
          newPassword: password.newPassword
        })
      });
      setPassword(emptyPassword);
      setMessage("Password changed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  function updateProfileField(field: keyof typeof profile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function updatePasswordField(field: keyof typeof password, value: string) {
    setPassword((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-5xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">Account</p>
            <h1 className="field-title">My Profile</h1>
          </div>
          <ThemeToggle />
        </header>

        <AdminMenu />

        {error ? (
          <div className="field-alert-error mt-5">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="field-alert-success mt-5 p-4 text-sm">
            {message}
          </div>
        ) : null}

        {loading ? (
          <section className="field-panel mt-5">
            <p className="field-muted">Loading profile...</p>
          </section>
        ) : (
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="field-panel">
              <h2 className="field-section-title">Information</h2>
              <p className="field-muted mt-1">Role: {userRole || "Unknown"}</p>
              <form className="mt-4 grid gap-4" onSubmit={saveProfile}>
                <TextInput label="Name" value={profile.name} required onChange={(value) => updateProfileField("name", value)} />
                <TextInput label="Email" type="email" value={profile.email} required onChange={(value) => updateProfileField("email", value)} />
                <PhoneNumberInput label="Contact Number" value={profile.phone} onChange={(value) => updateProfileField("phone", value)} />
                <button
                  className="field-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                  disabled={savingProfile || !profile.name.trim() || !profile.email.trim()}
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </section>

            <section className="field-panel">
              <h2 className="field-section-title">Password</h2>
              <form className="mt-4 grid gap-4" onSubmit={changePassword}>
                <TextInput label="Current Password" type="password" value={password.currentPassword} required onChange={(value) => updatePasswordField("currentPassword", value)} />
                <TextInput label="New Password" type="password" value={password.newPassword} required onChange={(value) => updatePasswordField("newPassword", value)} />
                <TextInput label="Confirm New Password" type="password" value={password.confirmPassword} required onChange={(value) => updatePasswordField("confirmPassword", value)} />
                <button
                  className="field-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  type="submit"
                  disabled={
                    savingPassword ||
                    !password.currentPassword.trim() ||
                    password.newPassword.length < 8 ||
                    password.newPassword !== password.confirmPassword
                  }
                >
                  {savingPassword ? "Changing..." : "Change Password"}
                </button>
              </form>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

function TextInput({
  label,
  value,
  onChange,
  required,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        className="field-input h-11"
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
