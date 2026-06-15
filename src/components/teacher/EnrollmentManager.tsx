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
}: {
  studentId: string;
  subjects: Subject[];
  enrolledIds: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const enrolled = new Set(enrolledIds);

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
              className="flex items-center justify-between rounded-xl border border-line p-3"
            >
              <span>{s.name}</span>
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
