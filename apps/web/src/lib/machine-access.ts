"use client";

export type MachineAccessSession = {
  accessToken: string;
  publicId: string;
  requesterName: string;
  requesterPhone: string;
  requesterEmail?: string | null;
  expiresAt: number;
};

function key(publicId: string) {
  return `support-system-machine-access-${publicId}`;
}

export function setMachineAccessSession(publicId: string, session: MachineAccessSession) {
  window.localStorage.setItem(key(publicId), JSON.stringify(session));
}

export function getMachineAccessSession(publicId: string) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key(publicId));
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as MachineAccessSession;
    if (!session.accessToken || session.expiresAt <= Date.now()) {
      clearMachineAccessSession(publicId);
      return null;
    }
    return session;
  } catch {
    clearMachineAccessSession(publicId);
    return null;
  }
}

export function clearMachineAccessSession(publicId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key(publicId));
}
