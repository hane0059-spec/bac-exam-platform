"use client";
// src/components/teacher/QuestionFilters.tsx
// فلاتر متتالية لبنك الأسئلة: المادة ← الوحدة ← الفصل ← الدرس.
import { useRouter } from "next/navigation";

interface Opt {
  id: string;
  name: string;
}

export default function QuestionFilters({
  subjects,
  units,
  chapters,
  lessons,
  current,
}: {
  subjects: Opt[];
  units: Opt[];
  chapters: Opt[];
  lessons: Opt[];
  current: {
    subjectId: string;
    unitId: string;
    chapterId: string;
    conceptId: string;
  };
}) {
  const router = useRouter();

  function go(params: Record<string, string>) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    router.push(`/teacher/questions${q.toString() ? `?${q}` : ""}`);
  }

  const sel = "field text-sm";
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <select
        className={sel}
        value={current.subjectId}
        onChange={(e) => go({ subjectId: e.target.value })}
      >
        <option value="">كل المواد</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <select
        className={sel}
        value={current.unitId}
        disabled={!current.subjectId}
        onChange={(e) =>
          go({ subjectId: current.subjectId, unitId: e.target.value })
        }
      >
        <option value="">كل الوحدات</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>

      <select
        className={sel}
        value={current.chapterId}
        disabled={!current.unitId}
        onChange={(e) =>
          go({
            subjectId: current.subjectId,
            unitId: current.unitId,
            chapterId: e.target.value,
          })
        }
      >
        <option value="">كل الفصول</option>
        {chapters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        className={sel}
        value={current.conceptId}
        disabled={!current.chapterId}
        onChange={(e) =>
          go({
            subjectId: current.subjectId,
            unitId: current.unitId,
            chapterId: current.chapterId,
            conceptId: e.target.value,
          })
        }
      >
        <option value="">كل الدروس</option>
        {lessons.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    </div>
  );
}
