"use client";
// src/components/teacher/NewQuizForm.tsx
// إنشاء اختبار جديد (عنوان + مادة) ثم الانتقال إلى الباني.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewQuizForm({
  subjects,
}: {
  subjects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/teacher/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, subjectId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر الإنشاء.");
      return;
    }
    router.push(`/teacher/quizzes/${data.id}/edit`);
  }

  return (
    <div className="card max-w-lg space-y-4 p-6">
      <div>
        <label className="mb-1 block text-sm font-medium">عنوان الاختبار</label>
        <input
          className="field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: اختبار الوحدة الأولى"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">المادة</label>
        <select
          className="field"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
      <button
        onClick={submit}
        disabled={busy || !title.trim()}
        className="btn-primary"
      >
        {busy ? "جارٍ الإنشاء…" : "إنشاء ومتابعة"}
      </button>
    </div>
  );
}
