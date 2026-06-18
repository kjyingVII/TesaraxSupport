"use client";

import { ReactNode, useEffect, useState } from "react";
import { clearAuthSession, getAccessToken, getAuthUser, type AuthUser } from "../lib/auth";
import { apiRequest } from "../lib/api";

type MeResponse = {
  data: AuthUser;
};

export function ProtectedPage({
  allowedRoles,
  children
}: {
  allowedRoles?: string[];
  children: ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const allowedRoleKey = allowedRoles?.join("|") ?? "";

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const token = getAccessToken();
      if (!token) {
        redirectToLogin();
        return;
      }

      const cachedUser = getAuthUser();
      if (mounted && cachedUser) setUser(cachedUser);

      try {
        const response = await apiRequest<MeResponse>("/api/auth/me");
        if (!mounted) return;
        if (allowedRoles?.length && !allowedRoles.includes(response.data.role)) {
          window.location.href = "/login";
          return;
        }
        setUser(response.data);
        setChecking(false);
      } catch {
        clearAuthSession();
        redirectToLogin();
      }
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [allowedRoleKey]);

  if (checking) {
    return (
      <main className="field-page grid place-items-center">
        <section className="field-panel">
          <p className="field-muted">Checking session...</p>
        </section>
      </main>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

function redirectToLogin() {
  const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.href = `/login?next=${next}`;
}
