"use client";
// src/components/teacher/GradePanel.tsx
// تصحيح المدرّس للإجابات القصيرة/المقالية (تعديل الدرجة + صحيح/خطأ).
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface GradeItem {
  nodeId: string;
  index: number;
  content: string;
  type: string;
  points: number;
  scoreEarned: number;
  isCorrect: boolean;
  textAnswer: string | null;
  acceptedAnswers: string[];
  explanation: string | null;
}

export default function GradePanel({
  sessionId,
  items,
}: {
  sessionId: string;
  items: GradeItem[];
}) {
  const router = useRouter();
  const [grades, setGrades] = useState(
    () =>
      new Map(
        items.map((it) => [
          it.nodeId,
          { scoreEarned: it.scoreEarned, isCorrect: it.isCorrect },
        ])
      )
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function setScore(nodeId: string, points: number, value: number) {
    const score = Math.min(Math.max(0, value), points);
    setGrades((prev) => {
      const next = new Map(prev);
      next.set(nodeId, { scoreEarned: score, isCorrect: score > 0 });
      return next;
    });
  }
  function setCorrect(nodeId: string, points: number, correct: boolean) {
    setGrades((prev) => {
      const next = new Map(prev);
      const cur = next.get(nodeId)!;
      next.set(nodeId, {
        isCorrect: correct,
        scoreEarned: correct ? (cur.scoreEarned || points) : 0,
      });
      return next;
    });
  }

  async function save() {
    setError("");
    setSaved(false);
    setBusy(true);
    const res = await fetch(`/api/teacher/sessions/${sessionId}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grades: items.map((it) => ({
          nodeId: it.nodeId,
          ...grades.get(it.nodeId)!,
        })),
      }),
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

  if (items.length === 0) return null;

  return (
    <div className="card border-r-4 border-r-gold p-5">
      <h3 className="mb-3 font-display font-semibold text-gold">
        إجابات بانتظار التصحيح ({items.length})
      </h3>
      <div className="space-y-4">
        {items.map((it) => {
          const g = grades.get(it.nodeId)!;
          const model =
            it.acceptedAnswers[0] ?? it.explanation ?? null;
          return (
            <div key={it.nodeId} className="rounded-xl border border-line p-3">
              <p className="font-medium">
                {it.index}. {it.content}
              </p>
              <p className="mt-2 text-sm">
                إجابة الطالب:{" "}
                <span className="text-ink/80">{it.textAnswer || "—"}</span>
              </p>
              {model && (
                <p className="mt-1 text-sm text-ink/50">النموذجية: {model}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  الدرجة:
                  <input
                    type="number"
                    min={0}
                    max={it.points}
                    step={0.25}
                    value={g.scoreEarned}
                    onChange={(e) =>
                      setScore(it.nodeId, it.points, Number(e.target.value))
                    }
                    className="field w-20 px-2 py-1"
                  />
                  <span className="text-ink/50">/ {it.points}</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={g.isCorrect}
                    onChange={(e) =>
                      setCorrect(it.nodeId, it.points, e.target.checked)
                    }
                    className="accent-primary"
                  />
                  صحيحة
                </label>
              </div>
            </div>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {saved && !error && (
        <p className="mt-3 text-sm text-primary-dark">تم اعتماد التصحيح.</p>
      )}
      <button onClick={save} disabled={busy} className="btn-primary mt-4">
        {busy ? "…" : "حفظ التصحيح"}
      </button>
    </div>
  );
}
