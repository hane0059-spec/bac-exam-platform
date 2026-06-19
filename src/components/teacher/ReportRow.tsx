"use client";
// src/components/teacher/ReportRow.tsx
// المدرّس: معالجة/تجاهل بلاغ خطأ على سؤال (مع ملاحظة اختيارية).
import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS: Record<string, { text: string; cls: string }> = {
  OPEN: { text: "مفتوح", cls: "bg-gold/15 text-gold" },
  RESOLVED: { text: "مُعالَج", cls: "bg-primary/10 text-primary-dark" },
  DISMISSED: { text: "مُتجاهَل", cls: "bg-ink/10 text-ink/50" },
};

export default function ReportRow({
  id,
  questionContent,
  reason,
  studentName,
  status,
  teacherNote,
  createdAt,
}: {
  id: string;
  questionContent: string;
  reason: string;
  studentName: string;
  status: string;
  teacherNote: string | null;
  createdAt: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState(teacherNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "resolve" | "dismiss" | "reopen") {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/teacher/reports/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: note || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الحفظ.");
      return;
    }
    router.refresh();
  }

  const st = STATUS[status] ?? STATUS.OPEN;
  const isOpen = status === "OPEN";

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium leading-relaxed">{questionContent}</p>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
          {st.text}
        </span>
      </div>

      <div className="rounded-xl bg-ink/5 p-3 text-sm">
        <span className="text-ink/50">البلاغ: </span>
        {reason}
        <p className="mt-1 text-xs text-ink/40">
          {studentName} • <bdi dir="ltr">{createdAt}</bdi>
        </p>
      </div>

      <input
        className="field text-sm"
        placeholder="ملاحظة المدرّس (اختياري)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {isOpen ? (
          <>
            <button
              onClick={() => act("resolve")}
              disabled={busy}
              className="btn-primary px-4 py-1.5 text-sm"
            >
              تمّت المعالجة
            </button>
            <button
              onClick={() => act("dismiss")}
              disabled={busy}
              className="rounded-xl border border-line px-4 py-1.5 text-sm hover:bg-ink/5"
            >
              تجاهل
            </button>
          </>
        ) : (
          <button
            onClick={() => act("reopen")}
            disabled={busy}
            className="rounded-xl border border-line px-4 py-1.5 text-sm hover:bg-ink/5"
          >
            إعادة فتح
          </button>
        )}
      </div>
    </div>
  );
}
