"use client";
// src/components/teacher/StudentAssignQuiz.tsx
// إسناد اختبار لطالب واحد من اختبارات المدرّس المنشورة (في مواد الطالب المسجّلة معه)،
// مع موعد اختياري، وعرض/إلغاء الإسنادات الحالية. يعيد استخدام مسار الإسناد القائم.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/datetime";
import DateTimeField from "@/components/DateTimeField";

export interface AssignableQuiz {
  id: string;
  title: string;
  subjectName: string;
}
export interface AssignedQuiz {
  id: string;
  title: string;
  subjectName: string;
  dueDate: string | null;
  statusLabel: string | null; // حالة أداء الطالب إن وُجدت
  inProgress: boolean; // يؤدّيه حالياً → لا يُلغى
}

export default function StudentAssignQuiz({
  studentId,
  studentName,
  assignable,
  assigned,
}: {
  studentId: string;
  studentName: string;
  assignable: AssignableQuiz[];
  assigned: AssignedQuiz[];
}) {
  const router = useRouter();
  const [quizId, setQuizId] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dueIso = () => (due ? new Date(due).toISOString() : null);

  async function assign() {
    if (!quizId) return;
    setError("");
    setBusy(true);
    const res = await fetch(`/api/teacher/quizzes/${quizId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: [studentId], dueDate: dueIso() }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الإسناد.");
      return;
    }
    setQuizId("");
    setDue("");
    router.refresh();
  }

  async function unassign(qId: string) {
    setError("");
    setBusy(true);
    const res = await fetch(
      `/api/teacher/quizzes/${qId}/assignments?studentId=${studentId}`,
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
    <div className="card space-y-4 p-5">
      <div>
        <h3 className="font-display font-semibold">إسناد اختبار</h3>
        <p className="mt-0.5 text-xs text-ink/50">
          من اختباراتك المنشورة في المواد المسجّل بها {studentName} معك.
        </p>
      </div>

      {assignable.length === 0 ? (
        <p className="rounded-xl bg-gold/10 p-3 text-sm text-gold">
          لا اختبارات متاحة للإسناد الآن — تأكّد من نشر الاختبار ومن تسجيل الطالب
          في مادته معك.
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1 block text-sm font-medium">الاختبار</label>
            <select
              className="field"
              value={quizId}
              onChange={(e) => setQuizId(e.target.value)}
            >
              <option value="">— اختر اختباراً —</option>
              {assignable.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.subjectName})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">
              موعد الاستحقاق (اختياري)
            </label>
            <DateTimeField value={due} onChange={setDue} />
          </div>
          <button
            onClick={assign}
            disabled={busy || !quizId}
            className="btn-primary"
          >
            أسنِد
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      {assigned.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-ink/70">
            الاختبارات المُسنَدة حاليّاً
          </p>
          {assigned.map((q) => (
            <div
              key={q.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{q.title}</span>
                  <span className="text-xs text-ink/40">{q.subjectName}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs">
                  {q.dueDate && (
                    <span className="text-ink/50">
                      الاستحقاق:{" "}
                      <bdi dir="ltr">{formatDateTime(q.dueDate)}</bdi>
                    </span>
                  )}
                  {q.statusLabel && (
                    <span className="text-primary-dark">{q.statusLabel}</span>
                  )}
                </div>
              </div>
              {q.inProgress ? (
                <span className="text-xs text-gold">يؤدّيه الآن</span>
              ) : (
                <button
                  onClick={() => unassign(q.id)}
                  disabled={busy}
                  className="text-sm text-red-500 hover:underline disabled:opacity-50"
                >
                  إلغاء الإسناد
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
