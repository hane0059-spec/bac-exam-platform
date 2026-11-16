"use client";
// src/components/math/MathField.tsx
// محرّر معادلات MathLive (يُنتج LaTeX) مع لوحة مفاتيح افتراضية حسب المادة.
// يُحمَّل ديناميكياً على العميل فقط (يتجنّب أخطاء SSR لاعتماده على window).
import { useEffect, useRef, useState } from "react";
import { layoutsFor, customTab, type MathLayout } from "./keyboards";
import type { BankSymbol } from "./symbolBank";
import { useBackGuard } from "@/lib/backGuard";

// آخر حقل معادلات نال التركيز (الأيقونة داخل الحقل تُفقده التركيز لحظة فتح اللوحة فلا يصلح hasFocus).
let lastFocusedField: unknown = null;
// آخر مجموعة تبويبات طُبِّقت على اللوحة المشتركة. إعادة إسناد `vk.layouts` تُعيد بناء عنصر اللوحة (`rebuild()`)
// وهو يقيس ارتفاعها فوراً ولا يعيد ربط مراقب الحجم بالعنصر الجديد، فتبقى اللوحة مُزاحةً بارتفاع خاطئ
// (تظهر ناقصة من الأسفل). لذا لا نُسنِد إلا عند تغيّر المجموعة فعلاً، ومن لوحة مخفيّة.
let appliedLayoutsKey = "";
// عدد حقول المعادلات المركّبة الآن: اللوحة مشتركة، وإن اختفى آخر حقل (إلغاء/إدراج المعادلة) وبقيت ظاهرة
// صارت «يتيمة» بلا أي زرّ لإغلاقها (الزرّ العائم يتبع المكوّن)، فنُخفيها عند آخر إزالة.
let mountedFields = 0;

export default function MathField({
  value,
  onChange,
  layout,
  disabled = false,
  customSymbols,
}: {
  value: string;
  onChange: (latex: string) => void;
  layout: MathLayout;
  disabled?: boolean;
  customSymbols?: BankSymbol[];
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mfRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [kbOpen, setKbOpen] = useState(false);
  // هذه النسخة هي التي فتحت اللوحة (اللوحة واحدة مشتركة؛ زرّ الإغلاق العائم وحارس الرجوع لصاحبتها فقط).
  const [opened, setOpened] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);
  const openedRef = useRef(false);
  openedRef.current = opened;
  const layoutRef = useRef({ layout, customSymbols });
  layoutRef.current = { layout, customSymbols };

  function applyLayouts() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vk = (window as any).mathVirtualKeyboard;
    if (!vk) return;
    const { layout: l, customSymbols: cs } = layoutRef.current;
    const key = `${l}|${cs && cs.length > 0 ? JSON.stringify(cs) : ""}`;
    if (key === appliedLayoutsKey) return; // لا تغيير ← لا إعادة بناء
    const tabs = layoutsFor(l);
    // تبويب «لوحتي» (رموز المدرّس) أوّلاً إن وُجد.
    if (cs && cs.length > 0) tabs.unshift(customTab(cs));
    if (vk.visible) {
      // اللوحة ظاهرة بمجموعة أخرى: أخفِها ثم أسنِد ثم أظهرها فيُبنى العنصر ويُراقَب من جديد.
      vk.hide();
      vk.layouts = tabs;
      appliedLayoutsKey = key;
      vk.show();
      return;
    }
    vk.layouts = tabs;
    appliedLayoutsKey = key;
  }

  useEffect(() => {
    let disposed = false;
    mountedFields++;
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
      // أيّ طريق لفتح اللوحة (زرّنا أو أيقونة لوحة المفاتيح داخل الحقل نفسه) يعرض لوحة المادة.
      mf.addEventListener("focusin", () => {
        lastFocusedField = mf;
        applyLayouts();
      });
      hostRef.current.appendChild(mf);
      mfRef.current = mf;
    })();
    return () => {
      disposed = true;
      const mf = mfRef.current;
      mountedFields = Math.max(0, mountedFields - 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vk = (window as any).mathVirtualKeyboard;
      // أُغلقت لوحة المعادلات (إلغاء/إدراج) واللوحة مفتوحة: أخفِها إن كانت لهذا الحقل أو لم يبقَ أي حقل.
      if (vk?.visible && (openedRef.current || (mf && lastFocusedField === mf) || mountedFields === 0)) {
        try {
          vk.hide();
        } catch {
          /* تجاهل */
        }
      }
      mf?.remove();
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

  // مزامنة حالة التعطيل (قراءة فقط أثناء عرض التصحيح).
  useEffect(() => {
    const mf = mfRef.current;
    if (mf) mf.readOnly = disabled;
  }, [disabled]);

  // مزامنة حالة اللوحة مع أحداث MathLive (إغلاق خارجي).
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vk = (window as any).mathVirtualKeyboard;
    if (!vk) return;
    const handler = () => {
      const visible = !!vk.visible;
      setKbOpen(visible);
      setKbHeight(visible ? Math.round(vk.boundingRect?.height ?? 0) : 0);
      if (!visible) setOpened(false);
      else if (lastFocusedField && lastFocusedField === mfRef.current) setOpened(true);
    };
    vk.addEventListener("geometrychange", handler);
    return () => vk.removeEventListener("geometrychange", handler);
  }, []);

  // زرّ الرجوع في الهاتف يُغلق اللوحة بدل مغادرة الصفحة (كان يضيّع النموذج كلّه).
  useBackGuard(
    opened,
    () => {
      closeKeyboard();
      return "done";
    },
    true,
  );

  // ارتفاع اللوحة يُعرَف بعد اكتمال حركة ظهورها (حدث geometrychange الأوّل قد يُبلّغ 0)، فنقيسه دورياً ما دامت مفتوحة.
  useEffect(() => {
    if (!opened) return;
    const measure = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vk = (window as any).mathVirtualKeyboard;
      // تصحيح ذاتي: إن قيس ارتفاع اللوحة مبكراً (قبل اكتمال الخطوط/التخطيط) أو فقد المراقب عنصرها ظهرت ناقصة؛
      // إعادة القياس تُصحّح إزاحتها فتظهر كاملة.
      try {
        vk?.adjustBoundingRect?.();
      } catch {
        /* تجاهل */
      }
      const el = document.querySelector(".ML__keyboard, .MLK__layer, .ML__keyboard-container") as HTMLElement | null;
      const h = Math.round(vk?.boundingRect?.height || el?.getBoundingClientRect().height || 0);
      setKbHeight((prev) => (prev === h ? prev : h));
    };
    measure();
    const t = window.setInterval(measure, 250);
    return () => window.clearInterval(t);
  }, [opened]);

  // Esc أو التركيز على أي حقل نصّي عاديّ (خارج المعادلات واللوحة) يُغلق اللوحة.
  useEffect(() => {
    if (!opened) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeKeyboard();
    };
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || !t.closest) return;
      if (t.closest("math-field, .ML__keyboard, .MLK__layer")) return;
      if (t.matches("input, textarea, select")) closeKeyboard();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocusIn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  function toggleKeyboard() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vk = (window as any).mathVirtualKeyboard;
    if (!vk) return;
    if (kbOpen) {
      vk.hide();
      setKbOpen(false);
      setOpened(false);
      return;
    }
    applyLayouts();
    mfRef.current?.focus();
    vk.show();
    setKbOpen(true);
    setOpened(true);
  }

  function closeKeyboard() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vk = (window as any).mathVirtualKeyboard;
    if (!vk) return;
    vk.hide();
    setKbOpen(false);
    setOpened(false);
  }

  return (
    <div className="space-y-2">
      <div
        ref={hostRef}
        className="rounded-xl border border-line bg-white p-2"
        dir="ltr"
      />
      {/* زرّ إغلاق عائم فوق اللوحة مباشرةً: زرّ «إغلاق» الداخلي يختفي خلفها على الهاتف. */}
      {opened && !disabled && (
        <button
          type="button"
          onClick={closeKeyboard}
          style={{ bottom: kbHeight + 10 }}
          className="fixed end-3 z-[200] rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-lg ring-2 ring-white/70"
        >
          ✕ إغلاق لوحة المعادلات
        </button>
      )}
      {!disabled && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleKeyboard}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              kbOpen
                ? "border-primary/40 bg-primary/8 text-primary"
                : "border-line hover:bg-ink/5"
            }`}
          >
            ⌨ لوحة المادة
          </button>
          {kbOpen && (
            <button
              type="button"
              onClick={closeKeyboard}
              title="إغلاق اللوحة"
              className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-ink/60 transition hover:bg-red-50 hover:border-red-200 hover:text-red-600"
            >
              ✕ إغلاق
            </button>
          )}
        </div>
      )}
    </div>
  );
}
