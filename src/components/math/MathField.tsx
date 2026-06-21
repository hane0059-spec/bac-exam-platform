"use client";
// src/components/math/MathField.tsx
// محرّر معادلات MathLive (يُنتج LaTeX) مع لوحة مفاتيح افتراضية حسب المادة.
// يُحمَّل ديناميكياً على العميل فقط (يتجنّب أخطاء SSR لاعتماده على window).
import { useEffect, useRef } from "react";
import { layoutsFor, type MathLayout } from "./keyboards";

export default function MathField({
  value,
  onChange,
  layout,
}: {
  value: string;
  onChange: (latex: string) => void;
  layout: MathLayout;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mfRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let disposed = false;
    (async () => {
      const mod = await import("mathlive");
      const MathfieldElement = mod.MathfieldElement;
      // خطوط MathLive من CDN (تفادي تهيئة تقديم الملفّات محلّياً).
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (MathfieldElement as any).fontsDirectory =
          "https://unpkg.com/mathlive@0.110.0/dist/fonts";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (MathfieldElement as any).soundsDirectory = null;
      } catch {
        /* تجاهل */
      }
      if (disposed || !hostRef.current) return;
      const mf = new MathfieldElement();
      mf.value = value;
      mf.style.width = "100%";
      mf.style.minHeight = "44px";
      mf.style.fontSize = "1.25rem";
      // لا تُظهر لوحة المفاتيح تلقائياً؛ نتحكّم بها بزرّ المادة.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mf as any).mathVirtualKeyboardPolicy = "manual";
      mf.addEventListener("input", () => onChangeRef.current(mf.value));
      hostRef.current.appendChild(mf);
      mfRef.current = mf;
    })();
    return () => {
      disposed = true;
      mfRef.current?.remove();
      mfRef.current = null;
    };
    // يُنشأ مرّةً؛ القيمة تُزامَن في useEffect منفصل.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // مزامنة القيمة الخارجية (مثلاً عند التفريغ بعد الإدراج).
  useEffect(() => {
    const mf = mfRef.current;
    if (mf && mf.value !== value) mf.value = value;
  }, [value]);

  function openKeyboard() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vk = (window as any).mathVirtualKeyboard;
    if (!vk) return;
    vk.layouts = layoutsFor(layout);
    mfRef.current?.focus();
    vk.show();
  }

  return (
    <div className="space-y-2">
      <div
        ref={hostRef}
        className="rounded-xl border border-line bg-white p-2"
        dir="ltr"
      />
      <button
        type="button"
        onClick={openKeyboard}
        className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-ink/5"
      >
        ⌨ لوحة المادة
      </button>
    </div>
  );
}
