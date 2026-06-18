"use client";

import { clearAuthSession } from "../lib/auth";

export function LogoutButton() {
  function logout() {
    clearAuthSession();
    window.location.href = "/login";
  }

  return (
    <button
      className="grid h-10 place-items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:hover:text-white"
      type="button"
      onClick={logout}
    >
      Logout
    </button>
  );
}
