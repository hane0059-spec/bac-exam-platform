"use client";
// src/components/TextSizeControl.tsx
// متحكّم بحجم النصّ لذوي ضعف البصر — بالنقر فقط (لا لوحة مفاتيح).
// يضبط حجم خطّ الجذر (٪) فتتكبّر كل النصوص بنسبٍ متناسقة، ويُحفظ على الجهاز.
import { useEffect, useState } from "react";

export const TEXT_SCALE_KEY = "bac-text-scale";

const LEVELS = [
  { v: 1, label: "عادي" },
  { v: 1.15, label: "كبير" },
  { v: 1.3, label: "أكبر" },
  { v: 1.5, label: "الأكبر" },
] as const;

export default function TextSizeControl() {
  const [scale, setScale] = useState<number>(1);

  // مزامنة الحالة مع ما هو محفوظ/مطبّق فعلاً عند التحميل.
  useEffect(() => {
    const saved = parseFloat(localStorage.getItem(TEXT_SCALE_KEY) ?? "1");
    if (!Number.isNaN(saved)) setScale(saved);
  }, []);

  function apply(v: number) {
    setScale(v);
    document.documentElement.style.fontSize = `${v * 100}%`;
    try {
      localStorage.setItem(TEXT_SCALE_KEY, String(v));
    } catch {
      /* تجاهل تعذّر الحفظ */
    }
  }

  return (
    <div
      role="group"
      aria-label="حجم النصّ"
      className="flex items-center gap-1 rounded-xl border border-line bg-surface px-1.5 py-1"
    >
      <span className="px-1 text-xs text-ink/50">الحجم</span>
      {LEVELS.map((l, i) => {
        const active = Math.abs(scale - l.v) < 0.001;
        return (
          <button
            key={l.v}
            type="button"
            onClick={() => apply(l.v)}
            aria-pressed={active}
            aria-label={`حجم النصّ: ${l.label}`}
            title={l.label}
            className={`flex h-8 w-8 items-center justify-center rounded-lg leading-none transition ${
              active
                ? "bg-primary text-white"
                : "text-ink/70 hover:bg-primary-light"
            }`}
          >
            <span style={{ fontSize: `${11 + i * 3}px` }}>أ</span>
          </button>
        );
      })}
    </div>
  );
}
