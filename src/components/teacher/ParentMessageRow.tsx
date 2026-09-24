"use client";
// src/components/teacher/ParentMessageRow.tsx
// بطاقة رسالة وليّ أمر لدى المدرّس: النصّ + ردّ (+ رابط منح محاولة لطلب الإعادة).
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface ParentMessageItem {
  id: string;
  kind: "OBJECTION" | "THANKS" | "RETAKE_REQUEST";
  body: string;
  status: "OPEN" | "ANSWERED";
  teacherResponse: string | null;
  createdAt: string;
  parentName: string;
  studentName: string;
  quizTitle: string;
  sessionHref: string;
  assignHref: string;
}

const KIND: Record<string, string> = {
  OBJECTION: "اعتراض",
  THANKS: "شكر",
  RETAKE_REQUEST: "طلب إعادة اختبار",
};

export default function ParentMessageRow({ item }: { item: ParentMessageItem }) {
  const router = useRouter();
  const [response, setResponse] = useState(item.teacherResponse ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reply() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/teacher/parent-messages/${item.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الإرسال.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary-dark">
              {KIND[item.kind]}
            </span>
            <span className="font-medium">وليّ أمر {item.studentName}</span>
          </div>
          <p className="mt-0.5 text-sm text-ink/60">
            {item.parentName} — «{item.quizTitle}»
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={item.sessionHref}
            className="rounded-xl border border-line px-3 py-1.5 text-sm hover:bg-ink/5"
          >
            عرض المحاولة
          </Link>
          {item.kind === "RETAKE_REQUEST" && (
            <Link
              href={item.assignHref}
              className="rounded-xl border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-light"
            >
              منح محاولة إضافية ←
            </Link>
          )}
        </div>
      </div>
      <p className="whitespace-pre-wrap rounded-xl bg-ink/5 p-3 text-sm leading-relaxed">
        {item.body}
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {item.status === "ANSWERED" ? "ردّك (يمكنك تعديله)" : "ردّك"}
        </label>
        <textarea
          className="field min-h-[64px] text-sm"
          maxLength={1000}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={reply}
        disabled={busy || !response.trim()}
        className="btn-primary px-4 py-1.5 text-sm disabled:opacity-50"
      >
        {busy ? "جارٍ الإرسال…" : item.status === "ANSWERED" ? "تحديث الردّ" : "إرسال الردّ"}
      </button>
    </div>
  );
}
