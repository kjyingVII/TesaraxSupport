"use client";

import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <select
      aria-label="Theme"
      className="h-10 rounded-md border border-[#cfd6dd] bg-white px-3 text-sm font-medium text-neutral-950 outline-none transition focus:border-[#155e75] dark:border-[#2f3742] dark:bg-[#171a21] dark:text-[#f5f7fa] dark:focus:border-[#22d3ee]"
      value={theme ?? "system"}
      onChange={(event) => setTheme(event.target.value)}
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
