// src/components/LogoutButton.tsx
"use client";

import { useState } from "react";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="rounded-lg border border-line bg-surface px-2 py-2 text-sm font-medium text-ink transition hover:bg-parchment disabled:opacity-60 sm:px-4"
    >
      {loading ? "…" : (
        <>
          <span className="sm:hidden">خروج</span>
          <span className="hidden sm:inline">تسجيل الخروج</span>
        </>
      )}
    </button>
  );
}
