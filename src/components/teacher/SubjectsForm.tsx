"use client";
// src/components/teacher/SubjectsForm.tsx
// نموذج اختيار موادّ المدرّس — مجموعة حسب الصفّ الدراسي مع مربّعات اختيار.
import { useState } from "react";

interface Subject {
  id: string;
  name: string;
  code: string;
  color: string | null;
}

interface GradeLevel {
  id: string;
  name: string;
  code: string;
  subjects: Subject[];
}

export default function SubjectsForm({
  gradeLevels,
  initialSelected,
}: {
  gradeLevels: GradeLevel[];
  initialSelected: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialSelected)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/teacher/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectIds: [...selected] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "تعذّر الحفظ");
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير معروف");
    } finally {
      setSaving(false);
    }
  }

  const totalSubjects = gradeLevels.reduce(
    (acc, gl) => acc + gl.subjects.length,
    0
  );

  if (totalSubjects === 0) {
    return (
      <div className="py-16 text-center text-ink/40">
        لم تُضَف مواد للمنصّة بعد
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ تمّ حفظ موادّك بنجاح.
        </div>
      )}

      <div className="space-y-5">
        {gradeLevels.map((gl) => (
          <section key={gl.id} className="card overflow-hidden">
            <div className="border-b border-line bg-surface/60 px-5 py-3">
              <h3 className="font-display font-semibold text-ink">{gl.name}</h3>
            </div>
            {gl.subjects.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink/40">
                لا توجد مواد في هذا الصفّ
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {gl.subjects.map((s) => {
                  const isSelected = selected.has(s.id);
                  return (
                    <li key={s.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-4 px-5 py-3.5 transition hover:bg-surface/60 ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        {/* مربّع اختيار مخصّص (ظاهريّ) */}
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
                            isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-line bg-surface"
                          }`}
                          aria-hidden
                        >
                          {isSelected && (
                            <svg
                              viewBox="0 0 12 10"
                              fill="none"
                              className="h-3 w-3"
                            >
                              <path
                                d="M1 5l3.5 3.5L11 1"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </span>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isSelected}
                          onChange={() => toggle(s.id)}
                        />
                        {s.color && (
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: s.color }}
                            aria-hidden
                          />
                        )}
                        <span className="font-medium text-ink">{s.name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-ink/50">
          {selected.size === 0
            ? "لم تختر أي مادة"
            : `${selected.size} ${selected.size === 1 ? "مادة مختارة" : "موادّ مختارة"}`}
        </p>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary min-w-28"
        >
          {saving ? "جارٍ الحفظ…" : "حفظ التغييرات"}
        </button>
      </div>
    </div>
  );
}
