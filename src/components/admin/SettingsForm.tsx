"use client";
// src/components/admin/SettingsForm.tsx
// المدير العام: اختيار خطّ المنصّة (يُطبَّق على كل الواجهات).
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FONT_OPTIONS,
  FONT_CSS,
  PLATFORM_MODE_OPTIONS,
  type FontKey,
  type PlatformMode,
} from "@/lib/settings";

export default function SettingsForm({
  currentFont,
  currentMode,
}: {
  currentFont: FontKey;
  currentMode: PlatformMode;
}) {
  const router = useRouter();
  const [font, setFont] = useState<FontKey>(currentFont);
  const [mode, setMode] = useState<PlatformMode>(currentMode);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const dirty = font !== currentFont || mode !== currentMode;

  async function save() {
    setError("");
    setDone(false);
    setBusy(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ font, platformMode: mode }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الحفظ.");
      return;
    }
    setDone(true);
    router.refresh(); // يعيد قراءة الخطّ والوضع في الواجهات.
  }

  return (
    <div className="card max-w-xl space-y-5 p-5">
      <div>
        <h3 className="mb-1 font-display font-semibold">وضع المنصّة</h3>
        <p className="text-sm text-ink/60">
          «الكامل» يدعم المدارس والمعاهد ومديريها وأولياء الأمور. «المبسّط»
          يقصر المنصّة على مدير عامّ ومدرّسين مستقلّين يديرون طلابهم ضمن حدّ
          الاشتراك (تُخفى المدارس وأولياء الأمور؛ بياناتها تبقى محفوظة).
        </p>
        <div className="mt-2 space-y-2">
          {PLATFORM_MODE_OPTIONS.map((m) => (
            <label
              key={m.key}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                mode === m.key
                  ? "border-primary bg-primary-light"
                  : "border-line hover:bg-ink/5"
              }`}
            >
              <input
                type="radio"
                name="platformMode"
                checked={mode === m.key}
                onChange={() => setMode(m.key)}
              />
              <span className="font-medium">{m.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <h3 className="mb-1 font-display font-semibold">خطّ المنصّة</h3>
        <p className="text-sm text-ink/60">
          يُطبَّق على كل واجهات الموقع لجميع المستخدمين.
        </p>
      </div>

      <div className="space-y-2">
        {FONT_OPTIONS.map((f) => (
          <label
            key={f.key}
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition ${
              font === f.key
                ? "border-primary bg-primary-light"
                : "border-line hover:bg-ink/5"
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="radio"
                name="font"
                checked={font === f.key}
                onChange={() => setFont(f.key)}
              />
              <span className="font-medium">{f.label}</span>
            </span>
            <span
              className="text-lg text-ink/70"
              style={{ fontFamily: FONT_CSS[f.key] }}
            >
              منصّة الاختبارات الإلكترونية
            </span>
          </label>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-primary-dark">تمّ الحفظ ✓</p>}

      <button
        onClick={save}
        disabled={busy || !dirty}
        className="btn-primary"
      >
        حفظ
      </button>
    </div>
  );
}
