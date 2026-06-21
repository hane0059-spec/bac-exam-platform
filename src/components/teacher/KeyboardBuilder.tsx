"use client";
// src/components/teacher/KeyboardBuilder.tsx
// باني لوحة المدرّس المخصّصة: لكل مادة، يلتقط المدرّس رموزاً من بنك الرموز
// إلى «لوحتي»، فتظهر في محرّر المعادلات (تأليفاً وأداءً) كتبويب أوّل.
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  bankCategoriesFor,
  type BankSymbol,
  type CustomKeyboard,
} from "@/components/math/symbolBank";
import { LAYOUT_OPTIONS, type MathLayout } from "@/components/math/keyboards";

export default function KeyboardBuilder({
  initial,
}: {
  initial: CustomKeyboard;
}) {
  const router = useRouter();
  const [layout, setLayout] = useState<MathLayout>("chemistry");
  const [selected, setSelected] = useState<CustomKeyboard>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<MathLayout | null>(null);
  const [error, setError] = useState("");

  const current = selected[layout] ?? [];
  const selectedLatex = new Set(current.map((s) => s.latex));

  function toggle(sym: BankSymbol) {
    setSaved(null);
    setSelected((prev) => {
      const list = prev[layout] ?? [];
      const exists = list.some((x) => x.latex === sym.latex);
      const next = exists
        ? list.filter((x) => x.latex !== sym.latex)
        : [...list, { latex: sym.latex, label: sym.label }];
      return { ...prev, [layout]: next };
    });
  }

  async function save() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/teacher/keyboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout, symbols: current }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الحفظ.");
      return;
    }
    setSaved(layout);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* اختيار المادة */}
      <div className="flex flex-wrap gap-2">
        {LAYOUT_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => {
              setLayout(o.key);
              setSaved(null);
            }}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
              layout === o.key
                ? "border-primary bg-primary text-white"
                : "border-line hover:bg-ink/5"
            }`}
          >
            {o.label}
            <span className="mr-1 text-xs opacity-70">
              ({(selected[o.key] ?? []).length})
            </span>
          </button>
        ))}
      </div>

      {/* لوحتي (المختارة) */}
      <div className="card p-4">
        <h3 className="mb-2 font-display font-semibold text-primary-dark">
          لوحتي — {LAYOUT_OPTIONS.find((o) => o.key === layout)?.label} (
          {current.length})
        </h3>
        {current.length === 0 ? (
          <p className="text-sm text-ink/50">
            لم تختر رموزاً بعد. انقر الرموز من البنك أدناه لإضافتها.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {current.map((sym) => (
              <button
                key={sym.latex}
                type="button"
                onClick={() => toggle(sym)}
                title="إزالة"
                className="rounded-lg border border-primary bg-primary-light px-3 py-1.5 text-sm text-primary-dark hover:bg-red-50 hover:border-red-300"
              >
                {sym.label} ✕
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-3">
          <button onClick={save} disabled={busy} className="btn-primary">
            {busy ? "…" : "حفظ لوحتي"}
          </button>
          {saved === layout && (
            <span className="text-sm text-primary-dark">تم الحفظ ✓</span>
          )}
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </div>

      {/* بنك الرموز */}
      <div className="space-y-4">
        <h3 className="font-display font-semibold">بنك الرموز</h3>
        {bankCategoriesFor(layout).map((cat) => (
          <div key={cat.id} className="card p-4">
            <h4 className="mb-2 text-sm font-medium text-ink/70">{cat.label}</h4>
            <div className="flex flex-wrap gap-2">
              {cat.symbols.map((sym) => {
                const on = selectedLatex.has(sym.latex);
                return (
                  <button
                    key={sym.latex}
                    type="button"
                    onClick={() => toggle(sym)}
                    className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                      on
                        ? "border-primary bg-primary text-white"
                        : "border-line hover:border-primary/40 hover:bg-ink/5"
                    }`}
                  >
                    {sym.label}
                    {on && " ✓"}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
