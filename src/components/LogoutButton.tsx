// src/components/LogoutButton.tsx
// زرّ تسجيل الخروج: يطلب تأكيداً قبل الخروج حتى لا يُلمَس بالخطأ (قرب أزرار أخرى أو أثناء الأداء).
"use client";

import { useEffect, useState } from "react";
import { detachThisDevice } from "@/lib/pushClient";

export default function LogoutButton({ fullWidth = false }: { fullWidth?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleLogout() {
    setLoading(true);
    try {
      // فصل الجهاز عن الحساب قبل الخروج (يلزم أن تكون الجلسة قائمة).
      await detachThisDevice();
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-lg border border-line bg-surface px-2 py-2 text-sm font-medium text-ink transition hover:bg-parchment sm:px-4 ${
          fullWidth ? "w-full" : ""
        }`}
      >
        <span className="sm:hidden">خروج</span>
        <span className="hidden sm:inline">تسجيل الخروج</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 print:hidden"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="تأكيد تسجيل الخروج"
            className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold">تسجيل الخروج؟</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
              ستخرج من حسابك. إن كنتَ في اختبار فسيبقى وقته جارياً.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loading}
                className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-800 transition hover:bg-red-50 disabled:opacity-60"
              >
                {loading ? "جارٍ الخروج…" : "نعم، سجّل خروجي"}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                disabled={loading}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                البقاء في حسابي
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
