"use client";
// src/components/student/StudentMessageBox.tsx
// الطالب بعد نتيجته النهائية: مراسلة مدرّس الاختبار + عرض رسائله وردود المدرّس.
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface StudentPastMessage {
  id: string;
  kind: "QUESTION" | "RETAKE_REQUEST" | "THANKS";
  body: string;
  status: "OPEN" | "ANSWERED";
  teacherResponse: string | null;
}

const KIND: Record<string, string> = {
  QUESTION: "سؤال عن نتيجتي",
  RETAKE_REQUEST: "طلب إعادة اختبار",
  THANKS: "شكر",
};

export default function StudentMessageBox({
  sessionId,
  past,
  onSent,
}: {
  sessionId: string;
  past: StudentPastMessage[];
  /** للواجهات التي لا تُعيد جلب البيانات من الخادم عند refresh (مثل QuizRunner). */
  onSent?: () => void;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<StudentPastMessage["kind"]>("QUESTION");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);

  async function send() {
    setBusy(true);
    setError("");
    setSent(false);
    const res = await fetch("/api/student/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, kind, body }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الإرسال.");
      return;
    }
    setBody("");
    setSent(true);
    setOpen(false);
    onSent?.();
    router.refresh();
  }

  const answered = past.filter((m) => m.status === "ANSWERED" && m.teacherResponse);

  return (
    <div className="space-y-3 print:hidden">
      {/* ردود المدرّس في المقدّمة */}
      {answered.map((m) => (
        <div key={m.id} className="rounded-2xl border border-primary/30 bg-primary-light p-4 text-sm leading-relaxed">
          <p className="mb-1 font-medium text-primary-dark">
            💬 ردّ مدرّسك على «{KIND[m.kind]}»
          </p>
          <p className="mb-2 rounded-lg bg-surface/70 p-2 text-ink/60">
            رسالتك: {m.body}
          </p>
          <p className="whitespace-pre-wrap">{m.teacherResponse}</p>
        </div>
      ))}
      {past
        .filter((m) => m.status === "OPEN")
        .map((m) => (
          <div key={m.id} className="rounded-2xl bg-ink/5 p-3 text-sm">
            <span className="font-medium">{KIND[m.kind]}</span>
            <span className="mr-2 rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">
              بانتظار ردّ المدرّس
            </span>
            <p className="mt-1 whitespace-pre-wrap text-ink/70">{m.body}</p>
          </div>
        ))}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5"
        >
          ✉️ راسل مدرّسك عن هذه النتيجة
        </button>
      ) : (
        <div className="card space-y-3 p-4">
          <h3 className="font-display font-semibold">مراسلة المدرّس</h3>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(KIND) as StudentPastMessage["kind"][]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  kind === k
                    ? "border-primary bg-primary-light font-medium text-primary-dark"
                    : "border-line text-ink/60 hover:bg-ink/5"
                }`}
              >
                {KIND[k]}
              </button>
            ))}
          </div>
          <textarea
            className="field min-h-[80px]"
            maxLength={1000}
            placeholder="اكتب رسالتك للمدرّس…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={send}
              disabled={busy || body.trim().length < 3}
              className="btn-primary disabled:opacity-50"
            >
              {busy ? "جارٍ الإرسال…" : "إرسال"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-line px-4 py-2 text-sm hover:bg-ink/5"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
      {sent && !open && (
        <p className="text-sm text-primary-dark">أُرسلت رسالتك إلى المدرّس.</p>
      )}
      {answered.length === 0 && past.length === 0 && !open && null}
    </div>
  );
}
