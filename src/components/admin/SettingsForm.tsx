"use client";
// src/components/admin/SettingsForm.tsx
// المدير العام: اختيار خطّ المنصّة (يُطبَّق على كل الواجهات).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FONT_OPTIONS, type FontKey } from "@/lib/settings";

const PREVIEW_VAR: Record<FontKey, string> = {
  cairo: "var(--font-cairo)",
  tajawal: "var(--font-tajawal)",
  reem: "var(--font-reem)",
};

export default function SettingsForm({ current }: { current: FontKey }) {
  const router = useRouter();
  const [font, setFont] = useState<FontKey>(current);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    setDone(false);
    setBusy(true);
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ font }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الحفظ.");
      return;
    }
    setDone(true);
    router.refresh(); // يعيد قراءة الخطّ في التخطيط الجذري.
  }

  return (
    <div className="card max-w-xl space-y-4 p-5">
      <div>
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
              style={{ fontFamily: PREVIEW_VAR[f.key] }}
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
        disabled={busy || font === current}
        className="btn-primary"
      >
        حفظ
      </button>
    </div>
  );
}
