"use client";

import { FormEvent, useMemo, useState } from "react";
import { ThemeToggle } from "../../components/theme-toggle";
import { apiRequest } from "../../lib/api";
import { setAuthSession, type AuthUser } from "../../lib/auth";

type LoginResponse = {
  data: {
    accessToken: string;
    user: AuthUser;
  };
};

export function LoginForm() {
  const [email, setEmail] = useState("technician@example.com");
  const [password, setPassword] = useState("password123");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.trim() && password.trim(), [email, password]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await apiRequest<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setAuthSession(response.data.accessToken, response.data.user);
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("next") || "/technician/tickets";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-5 sm:px-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Machine Support</p>
            <h1 className="text-2xl font-semibold">Login</h1>
          </div>
          <ThemeToggle />
        </header>

        <form className="mt-8 rounded-lg border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900" onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-base outline-none focus:border-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Password</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-base outline-none focus:border-neutral-950 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
              {error}
            </div>
          ) : null}

          <button
            className="mt-5 h-11 w-full rounded-md bg-neutral-950 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-50 dark:text-neutral-950"
            type="submit"
            disabled={!canSubmit || submitting}
          >
            {submitting ? "Logging in..." : "Login"}
          </button>

          <div className="mt-5 rounded-md bg-neutral-100 p-3 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            Demo accounts: `technician@example.com` or `admin@example.com` with password `password123`.
          </div>
        </form>
      </section>
    </main>
  );
}
