"use client";
// src/components/admin/AdminEnrollmentManager.tsx
// المدير: تسجيل الطالب مع مدرّس في مادة، وإلغاء التسجيل.
import { useState } from "react";
import { useRouter } from "next/navigation";

interface TeacherOpt {
  id: string;
  name: string;
  subjects: { id: string; name: string }[];
}
interface Enrollment {
  id: string;
  teacherName: string;
  subjectName: string;
}

export default function AdminEnrollmentManager({
  studentId,
  teachers,
  current,
}: {
  studentId: string;
  teachers: TeacherOpt[];
  current: Enrollment[];
}) {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(
    teachers[0]?.subjects[0]?.id ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const teacher = teachers.find((t) => t.id === teacherId);
  const subjects = teacher?.subjects ?? [];

  function pickTeacher(id: string) {
    setTeacherId(id);
    const t = teachers.find((x) => x.id === id);
    setSubjectId(t?.subjects[0]?.id ?? "");
  }

  async function add() {
    if (!teacherId || !subjectId) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/students/${studentId}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId, subjectId }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر التسجيل.");
      return;
    }
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    setError("");
    const res = await fetch(
      `/api/admin/students/${studentId}/enrollments?enrollmentId=${id}`,
      { method: "DELETE" },
    );
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الإلغاء.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card max-w-2xl space-y-4 p-6">
      <h3 className="font-display font-semibold">التسجيل في المواد</h3>

      {current.length > 0 ? (
        <div className="space-y-2">
          {current.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-xl border border-line p-3 text-sm"
            >
              <span>
                {e.subjectName}
                <span className="text-ink/50"> • {e.teacherName}</span>
              </span>
              <button
                onClick={() => remove(e.id)}
                disabled={busy}
                className="text-red-500 hover:underline"
              >
                إلغاء التسجيل
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink/50">لا تسجيلات بعد.</p>
      )}

      {teachers.length === 0 ? (
        <p className="text-sm text-ink/50">لا مدرّسون في مؤسّسة الطالب.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <select
            className="field"
            value={teacherId}
            onChange={(e) => pickTeacher(e.target.value)}
          >
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            className="field"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={subjects.length === 0}
          >
            {subjects.length === 0 ? (
              <option value="">لا مواد لهذا المدرّس</option>
            ) : (
              subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))
            )}
          </select>
          <button
            onClick={add}
            disabled={busy || !teacherId || !subjectId}
            className="btn-primary"
          >
            تسجيل
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
