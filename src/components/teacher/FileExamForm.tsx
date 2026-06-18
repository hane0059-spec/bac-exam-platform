"use client";
// src/components/teacher/FileExamForm.tsx
// المدرّس: إنشاء اختبار ورقي/مرفوع (يُرفَع ملفه لاحقاً من صفحة الإدارة).
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FileExamForm({
  subjects,
}: {
  subjects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [maxScore, setMaxScore] = useState(20);
  const [minutes, setMinutes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/teacher/file-exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subjectId,
        description: description || undefined,
        maxScore: Number(maxScore),
        timeLimitSec: minutes ? Number(minutes) * 60 : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر الإنشاء.");
      return;
    }
    router.push(`/teacher/file-exams/${data.id}`);
    router.refresh();
  }

  if (subjects.length === 0) {
    return (
      <div className="card p-6 text-center text-ink/60">
        لا مواد مسندة إليك. تواصل مع الإدارة لإسناد مادة.
      </div>
    );
  }

  return (
    <div className="card max-w-xl space-y-3 p-5">
      <input
        className="field"
        placeholder="عنوان الاختبار"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
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
      <textarea
        className="field min-h-[72px]"
        placeholder="وصف/تعليمات (اختياري)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-ink/60">الدرجة القصوى</label>
          <input
            type="number"
            min={1}
            className="field"
            value={maxScore}
            onChange={(e) => setMaxScore(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-ink/60">
            المدة بالدقائق (اختياري)
          </label>
          <input
            type="number"
            min={1}
            dir="ltr"
            className="field"
            placeholder="—"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={busy || !title.trim() || !subjectId || maxScore < 1}
        className="btn-primary"
      >
        إنشاء ثم رفع الملف
      </button>
    </div>
  );
}
