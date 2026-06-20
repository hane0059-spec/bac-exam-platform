"use client";
// src/components/student/AppealBox.tsx
// اعتراض الطالب على نتيجة تصحيح يدوي: يعرض حالة آخر اعتراض ويتيح تقديم اعتراض
// جديد ما لم يكن هناك اعتراض مفتوح. يُستعمل في نتيجة الاختبار العادي والورقي.
import { useState } from "react";

export interface AppealState {
  status: "OPEN" | "ACCEPTED" | "REJECTED";
  reason: string;
  teacherResponse: string | null;
}

export default function AppealBox({
  sessionId,
  appealable,
  appeal,
}: {
  sessionId: string;
  appealable: boolean;
  appeal: AppealState | null;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!appealable) return null;

  const hasOpen = appeal?.status === "OPEN";

  async function send() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/student/appeals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر إرسال الاعتراض.");
      return;
    }
    setDone(true);
    setOpen(false);
  }

  const statusCard =
    appeal && !done ? (
      <div
        className={`rounded-xl border-r-4 p-3 text-sm ${
          appeal.status === "OPEN"
            ? "border-r-gold bg-gold/10"
            : appeal.status === "ACCEPTED"
            ? "border-r-primary bg-primary-light/60"
            : "border-r-red-500 bg-red-50"
        }`}
      >
        <p className="font-medium">
          {appeal.status === "OPEN"
            ? "اعتراضك قيد مراجعة المدرّس"
            : appeal.status === "ACCEPTED"
            ? "قُبِل اعتراضك"
            : "رُفِض اعتراضك"}
        </p>
        <p className="mt-1 text-ink/60">سببك: {appeal.reason}</p>
        {appeal.teacherResponse && (
          <p className="mt-1 text-ink/70">ردّ المدرّس: {appeal.teacherResponse}</p>
        )}
      </div>
    ) : null;

  return (
    <div className="space-y-3">
      {statusCard}

      {done ? (
        <p className="rounded-xl bg-primary-light p-3 text-sm text-primary-dark">
          تمّ إرسال اعتراضك إلى المدرّس. ستصلك نتيجة المراجعة.
        </p>
      ) : hasOpen ? null : open ? (
        <div className="space-y-2 rounded-xl border border-line p-3">
          <label className="block text-sm font-medium">سبب الاعتراض</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="اشرح سبب اعتراضك على التصحيح (مثال: إجابتي صحيحة ولم تُحتسب…)."
            className="field min-h-[80px] text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={send}
              disabled={busy || reason.trim().length < 5}
              className="btn-primary px-4 py-1.5 text-sm"
            >
              إرسال الاعتراض
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-ink/60 hover:underline"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-primary hover:underline"
        >
          {appeal ? "تقديم اعتراض جديد" : "اعتراض على النتيجة"}
        </button>
      )}
    </div>
  );
}
