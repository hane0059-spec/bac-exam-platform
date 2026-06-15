"use client";
// src/components/teacher/AssignPanel.tsx
// إسناد/إلغاء إسناد اختبار لطلاب المدرّس، مع موعد استحقاق اختياري.
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AssignStudent {
  id: string;
  name: string;
  studentCode: string;
  genderLabel: string; // «طالب» / «طالبة»
  assigned: boolean;
  dueDate: string | null;
  statusLabel: string | null; // حالة الأداء إن وُجدت
}

export default function AssignPanel({
  quizId,
  published,
  students,
}: {
  quizId: string;
  published: boolean;
  students: AssignStudent[];
}) {
  const router = useRouter();
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dueIso = () => (due ? new Date(due).toISOString() : null);
  const unassigned = students.filter((s) => !s.assigned);

  async function assign(ids: string[]) {
    if (ids.length === 0) return;
    setError("");
    setBusy(true);
    const res = await fetch(`/api/teacher/quizzes/${quizId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: ids, dueDate: dueIso() }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الإسناد.");
      return;
    }
    router.refresh();
  }

  async function unassign(studentId: string) {
    setError("");
    setBusy(true);
    const res = await fetch(
      `/api/teacher/quizzes/${quizId}/assignments?studentId=${studentId}`,
      { method: "DELETE" }
    );
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر إلغاء الإسناد.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {!published && (
        <div className="rounded-xl bg-gold/15 p-3 text-sm text-gold">
          هذا الاختبار غير منشور — انشره أولاً ليصل للطلاب بعد الإسناد.
        </div>
      )}

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium">
            موعد الاستحقاق (اختياري، يُطبَّق عند الإسناد)
          </label>
          <input
            type="datetime-local"
            className="field"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>
        <button
          onClick={() => assign(unassigned.map((s) => s.id))}
          disabled={busy || !published || unassigned.length === 0}
          className="btn-primary"
        >
          إسناد للجميع ({unassigned.length})
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      {students.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا طلاب مسجّلون معك في مادة هذا الاختبار.
        </div>
      ) : (
        <div className="space-y-2">
          {students.map((s) => (
            <div
              key={s.id}
              className="card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-ink/40">
                    {s.genderLabel} • {s.studentCode}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {s.assigned ? (
                    <span className="rounded-full bg-primary text-white px-2 py-0.5">
                      مُسنَد
                    </span>
                  ) : (
                    <span className="rounded-full bg-ink/10 px-2 py-0.5 text-ink/50">
                      غير مُسنَد
                    </span>
                  )}
                  {s.dueDate && (
                    <span className="text-ink/50">
                      الاستحقاق: {new Date(s.dueDate).toLocaleString("ar")}
                    </span>
                  )}
                  {s.statusLabel && (
                    <span className="text-primary-dark">{s.statusLabel}</span>
                  )}
                </div>
              </div>
              {s.assigned ? (
                <button
                  onClick={() => unassign(s.id)}
                  disabled={busy}
                  className="text-sm text-red-500 hover:underline disabled:opacity-50"
                >
                  إلغاء الإسناد
                </button>
              ) : (
                <button
                  onClick={() => assign([s.id])}
                  disabled={busy || !published}
                  className="rounded-lg bg-primary-light px-3 py-1 text-sm text-primary-dark hover:bg-primary hover:text-white disabled:opacity-50"
                >
                  إسناد
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
