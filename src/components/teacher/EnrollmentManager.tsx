"use client";
// src/components/teacher/EnrollmentManager.tsx
// تسجيل/إلغاء تسجيل الطالب في مواد المدرّس.
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Subject {
  id: string;
  name: string;
}

export default function EnrollmentManager({
  studentId,
  subjects,
  enrolledIds,
  groups = {},
}: {
  studentId: string;
  subjects: Subject[];
  enrolledIds: string[];
  /** مجموعة الطالب الحالية لكل مادة (subjectId → اسم). */
  groups?: Record<string, string>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const enrolled = new Set(enrolledIds);
  const [draft, setDraft] = useState<Record<string, string>>(groups);

  async function saveGroup(subjectId: string) {
    setError("");
    setBusy(`g-${subjectId}`);
    const res = await fetch(`/api/teacher/students/${studentId}/enrollments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, groupName: draft[subjectId] ?? "" }),
    });
    setBusy("");
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر حفظ المجموعة.");
      return;
    }
    router.refresh();
  }

  async function toggle(subjectId: string, isEnrolled: boolean) {
    setError("");
    setBusy(subjectId);
    const url = `/api/teacher/students/${studentId}/enrollments`;
    const res = isEnrolled
      ? await fetch(`${url}?subjectId=${subjectId}`, { method: "DELETE" })
      : await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subjectId }),
        });
    setBusy("");
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر التحديث.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card max-w-2xl space-y-3 p-6">
      <h3 className="font-display font-semibold">التسجيل في موادّك</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-2">
        {subjects.map((s) => {
          const isEnrolled = enrolled.has(s.id);
          return (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3"
            >
              <span>{s.name}</span>
              {isEnrolled && (
                <span className="flex items-center gap-1.5">
                  <input
                    className="field !w-40 !py-1 text-sm"
                    maxLength={60}
                    placeholder="المجموعة (اختياري)"
                    value={draft[s.id] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [s.id]: e.target.value }))
                    }
                  />
                  <button
                    onClick={() => saveGroup(s.id)}
                    disabled={
                      busy === `g-${s.id}` ||
                      (draft[s.id] ?? "") === (groups[s.id] ?? "")
                    }
                    className="rounded-lg bg-primary-light px-3 py-1 text-sm text-primary-dark transition hover:bg-primary hover:text-white disabled:opacity-40"
                  >
                    حفظ
                  </button>
                </span>
              )}
              <button
                onClick={() => toggle(s.id, isEnrolled)}
                disabled={busy === s.id}
                className={`rounded-lg px-3 py-1 text-sm transition disabled:opacity-50 ${
                  isEnrolled
                    ? "text-red-500 hover:underline"
                    : "bg-primary-light text-primary-dark hover:bg-primary hover:text-white"
                }`}
              >
                {isEnrolled ? "إلغاء التسجيل" : "تسجيل"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
