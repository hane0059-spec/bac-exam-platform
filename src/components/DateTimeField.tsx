"use client";
// src/components/DateTimeField.tsx
// حقل تاريخ/وقت رقمي خاص بنا (يوم/شهر/سنة — ساعة:دقيقة) لا يعتمد على لغة المتصفّح،
// فلا تظهر أسماء أشهر أو أحرف إطلاقاً. القيمة بصيغة "YYYY-MM-DDTHH:mm" (كـ datetime-local).
import { useEffect, useState } from "react";

interface Parts {
  d: string;
  mo: string;
  y: string;
  h: string;
  mi: string;
}

function toParts(value: string): Parts {
  if (!value) return { d: "", mo: "", y: "", h: "", mi: "" };
  const [date, time] = value.split("T");
  const [y = "", mo = "", d = ""] = date.split("-");
  const [h = "", mi = ""] = (time ?? "").split(":");
  const strip = (s: string) => (s === "" ? "" : String(Number(s)));
  return { d: strip(d), mo: strip(mo), y, h: strip(h), mi: strip(mi) };
}

function pad(s: string, len = 2): string {
  return s.padStart(len, "0");
}

function toValue(p: Parts): string {
  if (!p.y || !p.mo || !p.d) return "";
  const h = p.h === "" ? "00" : pad(p.h);
  const mi = p.mi === "" ? "00" : pad(p.mi);
  return `${pad(p.y, 4)}-${pad(p.mo)}-${pad(p.d)}T${h}:${mi}`;
}

export default function DateTimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [p, setP] = useState<Parts>(() => toParts(value));

  // مزامنة مع القيمة الخارجية؛ وعند الفراغ تُعبَّأ السنة والشهر من تاريخ النظام
  // افتراضياً (قابلة للتغيير)، فلا يبقى للمدرّس سوى إدخال اليوم والوقت.
  useEffect(() => {
    const parts = toParts(value);
    if (!value) {
      const now = new Date();
      parts.y = String(now.getFullYear());
      parts.mo = String(now.getMonth() + 1);
    }
    setP(parts);
  }, [value]);

  function update(patch: Partial<Parts>) {
    const next = { ...p, ...patch };
    setP(next);
    onChange(toValue(next));
  }

  const box = "rounded-lg border border-line bg-white px-1 py-2 text-center outline-none focus:border-primary";

  return (
    <div className="flex items-center gap-1" dir="ltr">
      <input
        type="number"
        min={1}
        max={31}
        placeholder="يوم"
        value={p.d}
        onChange={(e) => update({ d: e.target.value })}
        className={`${box} w-14`}
        aria-label="اليوم"
      />
      <span className="text-ink/40">/</span>
      <input
        type="number"
        min={1}
        max={12}
        placeholder="شهر"
        value={p.mo}
        onChange={(e) => update({ mo: e.target.value })}
        className={`${box} w-14`}
        aria-label="الشهر"
      />
      <span className="text-ink/40">/</span>
      <input
        type="number"
        min={2024}
        max={2100}
        placeholder="سنة"
        value={p.y}
        onChange={(e) => update({ y: e.target.value })}
        className={`${box} w-20`}
        aria-label="السنة"
      />
      <span className="mx-1 text-ink/40">—</span>
      <input
        type="number"
        min={0}
        max={23}
        placeholder="سا"
        value={p.h}
        onChange={(e) => update({ h: e.target.value })}
        className={`${box} w-14`}
        aria-label="الساعة"
      />
      <span className="text-ink/40">:</span>
      <input
        type="number"
        min={0}
        max={59}
        placeholder="د"
        value={p.mi}
        onChange={(e) => update({ mi: e.target.value })}
        className={`${box} w-14`}
        aria-label="الدقيقة"
      />
    </div>
  );
}
