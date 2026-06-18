"use client";
// src/components/teacher/FileGradePanel.tsx
// المدرّس: تصحيح محاولة ورقية واحدة (درجة + ملاحظة) — قابل للتعديل دائماً.
import { useState } from "react";
import { useRouter } from "next/navigation";
import AttachmentThumb from "@/components/AttachmentThumb";

interface Upload {
  id: string;
  mimeType: string;
}

export default function FileGradePanel({
  sessionId,
  studentName,
  max,
  uploads,
  initialScore,
  initialFeedback,
  needsGrading,
}: {
  sessionId: string;
  studentName: string;
  max: number;
  uploads: Upload[];
  initialScore: number | null;
  initialFeedback: string;
  needsGrading: boolean;
}) {
  const router = useRouter();
  const [score, setScore] = useState(
    initialScore === null ? "" : String(initialScore),
  );
  const [feedback, setFeedback] = useState(initialFeedback);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    setMsg("");
    const res = await fetch(
      `/api/teacher/file-exams/sessions/${sessionId}/grade`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: Number(score),
          feedback: feedback || undefined,
        }),
      },
    );
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "تعذّر الحفظ.");
    setMsg("تم الحفظ.");
    router.refresh();
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{studentName}</span>
        {needsGrading ? (
          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs text-gold">
            بانتظار التصحيح
          </span>
        ) : (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary-dark">
            مُصحّح
          </span>
        )}
      </div>

      {uploads.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {uploads.map((u) => (
            <AttachmentThumb key={u.id} id={u.id} mimeType={u.mimeType} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink/50">لا صور مرفوعة.</p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-sm text-ink/60">
            الدرجة (من {max})
          </label>
          <input
            type="number"
            min={0}
            max={max}
            dir="ltr"
            className="field w-28"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
        </div>
        <input
          className="field flex-1"
          placeholder="ملاحظة للطالب (اختياري)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <button
          onClick={save}
          disabled={busy || score === ""}
          className="btn-primary"
        >
          حفظ التصحيح
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-primary-dark">{msg}</p>}
    </div>
  );
}
