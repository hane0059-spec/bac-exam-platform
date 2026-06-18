"use client";
// src/components/admin/BankFilters.tsx
// المدير العام: فلاتر البنك العام — مؤسّسة / مادة / نوع.
import { useRouter } from "next/navigation";

interface Opt {
  id: string;
  name: string;
}

export default function BankFilters({
  basePath,
  schools,
  subjects,
  types,
  current,
}: {
  basePath: string;
  schools: Opt[];
  subjects: Opt[];
  types: Opt[];
  current: { schoolId: string; subjectId: string; type: string };
}) {
  const router = useRouter();

  function go(over: Record<string, string>) {
    const merged = { ...current, ...over };
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    router.push(`${basePath}${q.toString() ? `?${q}` : ""}`);
  }

  const sel = "field text-sm";
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <select
        className={sel}
        value={current.schoolId}
        onChange={(e) => go({ schoolId: e.target.value })}
      >
        <option value="">كل المؤسّسات</option>
        <option value="__none__">على مستوى المنصّة</option>
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

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
        value={current.type}
        onChange={(e) => go({ type: e.target.value })}
      >
        <option value="">كل الأنواع</option>
        {types.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
