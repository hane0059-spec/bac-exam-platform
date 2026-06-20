"use client";
// src/components/student/StudentArchiveToggle.tsx
// زرّ أرشفة/إلغاء أرشفة الطالب لاختبار (عرضيّ). يُستعمل في القائمة وصفحة النتيجة.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentArchiveToggle({
  quizId,
  archived,
  className = "",
}: {
  quizId: string;
  archived: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/student/quizzes/${quizId}/archive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !archived }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر التنفيذ.");
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={
          className ||
          "rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
        }
      >
        {archived ? "إلغاء الأرشفة" : "نقل إلى الأرشيف"}
      </button>
      {error && <span className="mt-1 text-xs text-red-600">{error}</span>}
    </span>
  );
}
