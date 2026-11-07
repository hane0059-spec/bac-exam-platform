"use client";
// src/components/admin/LargestFiles.tsx
// المدير العام: أكبر ملفّات «أسئلة وإثراء» (تستهلك أغلب تخزين القاعدة) مع حذف مباشر لتفريغ المساحة.
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface BigFileRow {
  id: string;
  title: string;
  sizeBytes: number;
  gradeName: string;
  /** من يملكه: عامّ للمدير، أو خاصّ بمدرّس، أو معتمَد من مدرّس. */
  ownerLabel: string;
  downloadCount: number;
}

function fmt(n: number): string {
  if (n < 1024) return `${n} ب`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} ك.ب`;
  return `${(n / (1024 * 1024)).toFixed(1)} م.ب`;
}

export default function LargestFiles({ rows }: { rows: BigFileRow[] }) {
  const router = useRouter();
  const [list, setList] = useState(rows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function remove(f: BigFileRow) {
    if (
      !confirm(
        `حذف «${f.title}» (${fmt(f.sizeBytes)}) نهائياً؟\n${f.ownerLabel}\nلا يمكن التراجع، وسيختفي عن كل من يراه.`,
      )
    )
      return;
    setBusyId(f.id);
    setError("");
    const res = await fetch(`/api/admin/resources/${f.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      setError("تعذّر الحذف، حاول مجدداً.");
      return;
    }
    setList((l) => l.filter((x) => x.id !== f.id));
    router.refresh();
  }

  if (list.length === 0) return null;
  return (
    <section className="mb-8" aria-label="أكبر الملفّات">
      <h3 className="mb-1 font-display font-semibold">أكبر ملفّات «أسئلة وإثراء»</h3>
      <p className="mb-3 text-xs text-ink/60">
        الملفّات المخزَّنة داخل القاعدة؛ حذف الأكبر هو أسرع طريق لتفريغ المساحة. تُحسب الملفّات فقط (لا المنشورات النصّية).
      </p>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {list.map((f) => (
          <li
            key={f.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2.5"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">{f.title}</span>
                <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary-dark">
                  {fmt(f.sizeBytes)}
                </span>
              </span>
              <span className="truncate text-xs text-ink/60">
                {f.gradeName} · {f.ownerLabel} · ⬇ {f.downloadCount}
              </span>
            </span>
            <button
              onClick={() => remove(f)}
              disabled={busyId === f.id}
              className="shrink-0 text-sm text-red-600 hover:underline disabled:opacity-50"
            >
              {busyId === f.id ? "جارٍ الحذف…" : "حذف"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
