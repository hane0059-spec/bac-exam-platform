"use client";
// src/components/parent/ParentMessageBox.tsx
// وليّ الأمر: مراسلة مدرّس الاختبار (اعتراض/شكر/طلب إعادة) + عرض رسائله وردودها.
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface PastMessage {
  id: string;
  kind: "OBJECTION" | "THANKS" | "RETAKE_REQUEST";
  body: string;
  status: "OPEN" | "ANSWERED";
  teacherResponse: string | null;
  createdAt: string;
}

const KIND: Record<string, string> = {
  OBJECTION: "اعتراض",
  THANKS: "شكر",
  RETAKE_REQUEST: "طلب إعادة اختبار",
};

export default function ParentMessageBox({
  sessionId,
  past,
}: {
  sessionId: string;
  past: PastMessage[];
}) {
  const router = useRouter();
  const [kind, setKind] = useState<PastMessage["kind"]>("OBJECTION");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function send() {
    setBusy(true);
    setError("");
    setSent(false);
    const res = await fetch("/api/parent/messages", {
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
    router.refresh();
  }

  return (
    <div className="card mb-6 space-y-3 p-5 print:hidden">
      <h3 className="font-display font-semibold">مراسلة مدرّس الاختبار</h3>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(KIND) as PastMessage["kind"][]).map((k) => (
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
        className="field min-h-[90px]"
        maxLength={1000}
        placeholder="اكتب رسالتك للمدرّس…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {sent && <p className="text-sm text-primary-dark">أُرسلت رسالتك إلى المدرّس.</p>}
      <button
        type="button"
        onClick={send}
        disabled={busy || body.trim().length < 3}
        className="btn-primary disabled:opacity-50"
      >
        {busy ? "جارٍ الإرسال…" : "إرسال"}
      </button>

      {past.length > 0 && (
        <div className="space-y-2 border-t border-line pt-3">
          <p className="text-sm font-medium text-ink/60">رسائلك السابقة</p>
          {past.map((m) => (
            <div key={m.id} className="rounded-xl bg-ink/5 p-3 text-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-medium">{KIND[m.kind]}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    m.status === "ANSWERED" ? "bg-primary text-white" : "bg-gold/15 text-gold"
                  }`}
                >
                  {m.status === "ANSWERED" ? "تمّ الردّ" : "بانتظار الردّ"}
                </span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
              {m.teacherResponse && (
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface p-2 leading-relaxed">
                  <span className="font-medium">ردّ المدرّس: </span>
                  {m.teacherResponse}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
