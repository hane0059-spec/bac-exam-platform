"use client";
// src/components/admin/SettingsForm.tsx
// المدير العام: اختيار خطّ المنصّة (يُطبَّق على كل الواجهات).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLATFORM_MODE_OPTIONS, type PlatformMode } from "@/lib/settings";
import { FONT_OPTIONS, FONT_CSS, type FontKey } from "@/lib/fonts";
import {
  BG_HUE_MIN,
  BG_HUE_MAX,
  BG_LIGHTNESS_MIN,
  BG_LIGHTNESS_MAX,
  BG_HUE_DEFAULT,
  BG_LIGHTNESS_DEFAULT,
  bgColorToHslCss,
  type BgColorValue,
} from "@/lib/bgColors";

// شريط تدرّج (Hue أو Lightness) بمؤشّر — dir="ltr" ثابت ليبقى السحب متوقَّعاً
// (يمين=أكبر) بصرف النظر عن rtl الصفحة.
function GradientSlider({
  value,
  min,
  max,
  gradient,
  onChange,
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  gradient: string;
  onChange: (v: number) => void;
  ariaLabel: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div dir="ltr" className="relative h-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 h-4 -translate-y-1/2 rounded-full border border-line"
        style={{ background: gradient }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 h-6 w-6 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white shadow"
        style={{ left: `${pct}%`, background: "rgb(var(--ink))" }}
      />
    </div>
  );
}

export default function SettingsForm({
  currentFont,
  currentMode,
  currentBgColor,
}: {
  currentFont: FontKey;
  currentMode: PlatformMode;
  currentBgColor: BgColorValue | null;
}) {
  const router = useRouter();
  const [font, setFont] = useState<FontKey>(currentFont);
  const [mode, setMode] = useState<PlatformMode>(currentMode);
  const [bgEnabled, setBgEnabled] = useState(currentBgColor !== null);
  const [hue, setHue] = useState(currentBgColor?.h ?? BG_HUE_DEFAULT);
  const [lightness, setLightness] = useState(
    currentBgColor?.l ?? BG_LIGHTNESS_DEFAULT
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const bgDirty =
    bgEnabled !== (currentBgColor !== null) ||
    (bgEnabled &&
      (hue !== (currentBgColor?.h ?? BG_HUE_DEFAULT) ||
        lightness !== (currentBgColor?.l ?? BG_LIGHTNESS_DEFAULT)));
  const dirty = font !== currentFont || mode !== currentMode || bgDirty;

  async function save() {
    setError("");
    setDone(false);
    setBusy(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        font,
        platformMode: mode,
        bgColor: bgEnabled ? { h: hue, l: lightness } : null,
      }),
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
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="font-display font-semibold">لون خلفية المنصّة</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={bgEnabled}
              onChange={(e) => setBgEnabled(e.target.checked)}
              className="accent-primary"
            />
            تخصيص
          </label>
        </div>
        <p className="mb-3 text-sm text-ink/60">
          خلفية الصفحة خلف البطاقات، في الوضع النهاري فقط (الوضع الليلي والطباعة
          لا يتأثّران). اختر أيّ درجة من التدرّج — بما فيها درجات أغمق.
        </p>

        <div className={`space-y-4 ${bgEnabled ? "" : "pointer-events-none opacity-40"}`}>
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-10 w-10 shrink-0 rounded-full border border-line"
              style={{ background: bgColorToHslCss({ h: hue, l: lightness }) }}
            />
            <div className="flex-1 space-y-3">
              <div>
                <p className="mb-1 text-xs font-medium text-ink/50">درجة اللون (Hue)</p>
                <GradientSlider
                  value={hue}
                  min={BG_HUE_MIN}
                  max={BG_HUE_MAX}
                  ariaLabel="درجة اللون"
                  onChange={setHue}
                  gradient="linear-gradient(to right, hsl(0 55% 60%), hsl(60 55% 60%), hsl(120 55% 60%), hsl(180 55% 60%), hsl(240 55% 60%), hsl(300 55% 60%), hsl(360 55% 60%))"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-ink/50">
                  الإضاءة (أغمق ← أفتح)
                </p>
                <GradientSlider
                  value={lightness}
                  min={BG_LIGHTNESS_MIN}
                  max={BG_LIGHTNESS_MAX}
                  ariaLabel="إضاءة اللون"
                  onChange={setLightness}
                  gradient={`linear-gradient(to right, hsl(${hue} 55% ${BG_LIGHTNESS_MIN}%), hsl(${hue} 55% ${BG_LIGHTNESS_MAX}%))`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-line pt-4">
        <h3 className="mb-1 font-display font-semibold">خطّ المنصّة</h3>
        <p className="text-sm text-ink/60">
          يُطبَّق على كل واجهات الموقع لجميع المستخدمين. خطوط الويب تظهر على كل
          الأجهزة، أمّا خطوط النظام فتظهر حسب توفّرها على جهاز الزائر، وإلا
          يُستخدم خطّ ويب بديل تلقائياً.
        </p>
      </div>

      {(["web", "system"] as const).map((kind) => (
        <div key={kind} className="space-y-2">
          <p className="text-xs font-semibold text-ink/50">
            {kind === "web" ? "خطوط الويب (تظهر للجميع)" : "خطوط النظام (حسب جهاز الزائر)"}
          </p>
          {FONT_OPTIONS.filter((f) => f.kind === kind).map((f) => (
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
                نموذج الخطّ
              </span>
            </label>
          ))}
        </div>
      ))}

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
