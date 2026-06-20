"use client";
// src/components/teacher/AppealRow.tsx
// بطاقة اعتراض لدى المدرّس: السبب + رابط إعادة التصحيح + ردّ (قبول/رفض/إعادة فتح).
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface AppealItem {
  id: string;
  studentName: string;
  quizTitle: string;
  reason: string;
  status: "OPEN" | "ACCEPTED" | "REJECTED";
  teacherResponse: string | null;
  createdAt: string;
  reviewHref: string; // صفحة إعادة التصحيح (جلسة عادية أو إجابات ورقية)
}

const STATUS: Record<string, { text: string; cls: string }> = {
  OPEN: { text: "مفتوح", cls: "bg-gold/15 text-gold" },
  ACCEPTED: { text: "مقبول", cls: "bg-primary text-white" },
  REJECTED: { text: "مرفوض", cls: "bg-red-100 text-red-700" },
};

export default function AppealRow({ appeal }: { appeal: AppealItem }) {
  const router = useRouter();
  const [response, setResponse] = useState(appeal.teacherResponse ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(action: "accept" | "reject" | "reopen") {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/teacher/appeals/${appeal.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, response }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الحفظ.");
      return;
    }
    router.refresh();
  }

  const st = STATUS[appeal.status];

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{appeal.studentName}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>
              {st.text}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-ink/60">{appeal.quizTitle}</p>
        </div>
        <Link
          href={appeal.reviewHref}
          className="rounded-xl border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-light"
        >
          إعادة التصحيح ←
        </Link>
      </div>

      <p className="rounded-xl bg-ink/5 p-3 text-sm leading-relaxed">
        <span className="font-medium">سبب الطالب: </span>
        {appeal.reason}
      </p>

      <div>
        <label className="mb-1 block text-sm font-medium">
          ردّك على الاعتراض (اختياري)
        </label>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="وضّح قرارك للطالب (مثال: عُدّلت درجتك بعد إعادة التصحيح…)."
          className="field min-h-[64px] text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {appeal.status === "OPEN" ? (
          <>
            <button
              onClick={() => act("accept")}
              disabled={busy}
              className="btn-primary px-4 py-1.5 text-sm"
            >
              قبول الاعتراض
            </button>
            <button
              onClick={() => act("reject")}
              disabled={busy}
              className="rounded-xl border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              رفض الاعتراض
            </button>
          </>
        ) : (
          <button
            onClick={() => act("reopen")}
            disabled={busy}
            className="rounded-xl border border-line px-4 py-1.5 text-sm font-medium hover:bg-ink/5"
          >
            إعادة فتح
          </button>
        )}
      </div>
    </div>
  );
}
