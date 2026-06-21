"use client";
// src/components/math/MathTextInput.tsx
// حقل نصّ (سطر/فقرة) مع مؤلّف معادلات: زرّ «fx» يفتح محرّر MathLive بلوحة
// مفاتيح حسب المادة، ويُدرج الناتج كـ $latex$ عند موضع المؤشّر في النصّ.
import { useRef, useState } from "react";
import MathField from "./MathField";
import MathText from "@/components/MathText";
import {
  LAYOUT_OPTIONS,
  subjectLayout,
  type MathLayout,
} from "./keyboards";

export default function MathTextInput({
  value,
  onChange,
  multiline = false,
  placeholder,
  dir,
  subjectName,
  className = "field",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  subjectName?: string;
  className?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [latex, setLatex] = useState("");
  // لوحة المعادلات تُفعَّل للمواد العلمية فقط (رياضيات/فيزياء/كيمياء).
  const subjLayout = subjectLayout(subjectName);
  const mathEnabled = subjLayout !== null;
  const [layoutOverride, setLayoutOverride] = useState<MathLayout | null>(null);
  const layout: MathLayout = layoutOverride ?? subjLayout ?? "math";

  function insert() {
    const snippet = `$${latex.trim()}$`;
    const el = ref.current;
    if (el && el.selectionStart != null) {
      const start = el.selectionStart;
      const end = el.selectionEnd ?? start;
      onChange(value.slice(0, start) + snippet + value.slice(end));
    } else {
      onChange((value ? value + " " : "") + snippet);
    }
    setLatex("");
    setOpen(false);
  }

  return (
    <div>
      <div className="flex items-start gap-2">
        {multiline ? (
          <textarea
            ref={ref as React.RefObject<HTMLTextAreaElement>}
            className={`${className} min-h-[80px] flex-1`}
            value={value}
            dir={dir}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            ref={ref as React.RefObject<HTMLInputElement>}
            className={`${className} flex-1`}
            value={value}
            dir={dir}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        {!disabled && mathEnabled && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            title="إدراج معادلة"
            className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-bold ${
              open
                ? "border-primary bg-primary-light text-primary-dark"
                : "border-line hover:bg-ink/5"
            }`}
          >
            √x
          </button>
        )}
      </div>

      {/* معاينة المعادلات داخل النصّ (للمواد العلمية فقط). */}
      {mathEnabled && value.includes("$") && (
        <p className="mt-1 text-sm text-ink/70">
          المعاينة: <MathText text={value} />
        </p>
      )}

      {open && mathEnabled && (
        <div className="mt-2 space-y-2 rounded-xl border border-primary/30 bg-primary-light/30 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-ink/70">لوحة:</span>
            {LAYOUT_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setLayoutOverride(o.key)}
                className={`rounded-lg border px-2.5 py-1 text-xs ${
                  layout === o.key
                    ? "border-primary bg-primary text-white"
                    : "border-line hover:bg-ink/5"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <MathField value={latex} onChange={setLatex} layout={layout} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={insert}
              disabled={!latex.trim()}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              إدراج المعادلة
            </button>
            <button
              type="button"
              onClick={() => {
                setLatex("");
                setOpen(false);
              }}
              className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
