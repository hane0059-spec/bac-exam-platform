"use client";
// src/components/teacher/SessionFeedbackBox.tsx
// ملاحظة المدرّس للطالب على نتيجته (تشجيع/إعادة/توجيه) — تظهر بجانب النتيجة.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const QUICK = [
  "أحسنت! نتيجة ممتازة، استمرّ على هذا المستوى 👏",
  "جهد جيّد، راجع الأسئلة الخاطئة وستتحسّن أكثر إن شاء الله.",
  "أنصحك بمراجعة الدرس ثم إعادة الاختبار، وسأمنحك محاولة إضافية.",
];

export default function SessionFeedbackBox({
  sessionId,
  initial,
  assignHref,
}: {
  sessionId: string;
  initial: string;
  assignHref: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    const res = await fetch(`/api/teacher/sessions/${sessionId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: text }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الحفظ.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display font-semibold">ملاحظتك للطالب</h3>
        <Link
          href={assignHref}
          className="text-sm text-primary hover:underline"
        >
          منح محاولة إضافية ←
        </Link>
      </div>
      <p className="text-xs text-ink/50">
        تظهر بجانب نتيجة الطالب (ويراها وليّ أمره) ويصله إشعار. اتركها فارغة واحفظ لحذفها.
      </p>
      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setText(q)}
            className="rounded-full border border-line px-3 py-1 text-xs text-ink/70 hover:bg-ink/5"
          >
            {q.length > 34 ? q.slice(0, 34) + "…" : q}
          </button>
        ))}
      </div>
      <textarea
        className="field min-h-[80px]"
        maxLength={1000}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="اكتب تشجيعاً أو توجيهاً أو ملاحظة عن إعادة الاختبار…"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-primary-dark">تمّ الحفظ.</p>}
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="btn-primary disabled:opacity-50"
      >
        {busy ? "جارٍ الحفظ…" : "حفظ الملاحظة"}
      </button>
    </div>
  );
}
