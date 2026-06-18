export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:14000";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("support-system-access-token") : null;
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.error?.message ?? payload?.message ?? "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}
