"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ThemeToggle } from "../../../../components/theme-toggle";
import { apiRequest } from "../../../../lib/api";
import { setMachineAccessSession } from "../../../../lib/machine-access";

type AccessResponse = {
  data: {
    accessToken: string;
    expiresInSeconds: number;
    otpRequired: boolean;
    requester: {
      name: string;
      phone: string;
      email: string | null;
    };
    machine: {
      publicId: string;
      machineName: string;
      model: string;
      serialNumber: string;
      location: string;
      customerName: string;
    };
  };
};

export function MachineAccessPage({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await apiRequest<AccessResponse>(`/api/public/machines/${publicId}/access`, {
        method: "POST",
        body: JSON.stringify({
          requesterName,
          requesterPhone,
          requesterEmail: requesterEmail || undefined,
          password
        })
      });

      setMachineAccessSession(publicId, {
        accessToken: response.data.accessToken,
        publicId,
        requesterName: response.data.requester.name,
        requesterPhone: response.data.requester.phone,
        requesterEmail: response.data.requester.email,
        expiresAt: Date.now() + response.data.expiresInSeconds * 1000
      });

      router.push(`/m/${publicId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to access machine.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="field-page">
      <section className="field-shell max-w-xl">
        <header className="field-header">
          <div>
            <p className="field-eyebrow">Machine Support</p>
            <h1 className="field-title">Machine Access</h1>
          </div>
          <ThemeToggle />
        </header>

        <section className="field-panel mt-6">
          <div className="mb-5 rounded-md border border-cyan-100 bg-cyan-50 p-4 dark:border-cyan-900 dark:bg-cyan-950/50">
            <p className="text-sm font-semibold text-cyan-950 dark:text-cyan-100">Secure machine entry</p>
            <p className="mt-1 text-sm leading-6 text-cyan-900/80 dark:text-cyan-100/80">
              Enter your details and the machine password to view tickets, logs, and service status.
            </p>
          </div>
          <form className="grid gap-4" onSubmit={submitAccess}>
            {error ? (
              <div className="field-alert-error">
                {error}
              </div>
            ) : null}

            <TextInput label="Name" value={requesterName} required onChange={setRequesterName} />
            <TextInput label="Contact Number" value={requesterPhone} required onChange={setRequesterPhone} />
            <TextInput label="Email" type="email" value={requesterEmail} onChange={setRequesterEmail} />
            <TextInput label="Machine Password" type="password" value={password} required onChange={setPassword} />

            <button
              className="field-button-primary min-h-12 text-base"
              type="submit"
              disabled={submitting || !requesterName.trim() || !requesterPhone.trim() || !password.trim()}
            >
              {submitting ? "Checking..." : "Enter Machine Page"}
            </button>
          </form>
        </section>

        <Link className="field-link mt-4" href="/login">
          Staff login
        </Link>
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
        className="field-input"
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
