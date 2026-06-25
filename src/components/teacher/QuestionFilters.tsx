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
    tag: string;
  };
}) {
  const router = useRouter();

  function go(params: Record<string, string>) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    router.push(`/teacher/questions${q.toString() ? `?${q}` : ""}`);
  }

  function goTag(tag: string) {
    const q = new URLSearchParams();
    if (current.subjectId) q.set("subjectId", current.subjectId);
    if (tag) q.set("tag", tag);
    router.push(`/teacher/questions${q.toString() ? `?${q}` : ""}`);
  }

  const sel = "field text-sm";
  return (
    <div className="space-y-2">
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
    {/* بحث بالوسم */}
    <div className="flex items-center gap-2">
      <input
        type="search"
        className="field flex-1 text-sm"
        value={current.tag}
        placeholder="فلترة بالوسم — مثال: كهرباء"
        onChange={(e) => goTag(e.target.value)}
      />
      {current.tag && (
        <button
          type="button"
          onClick={() => goTag("")}
          className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs text-ink/60 hover:bg-ink/5"
        >
          ✕ إلغاء الوسم
        </button>
      )}
    </div>
    </div>
  );
}
