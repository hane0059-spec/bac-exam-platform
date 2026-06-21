"use client";
// src/components/math/MathAnswerInput.tsx
// مُدخل إجابة الطالب الرياضية بلوحة MathLive. يُخزّن القيمة مغلّفةً بـ $…$
// كي تُعرَض تلقائياً عبر MathText في المراجعة، ويجرّدها التصحيح على الخادم.
import MathField from "@/components/math/MathField";
import type { MathLayout } from "@/components/math/keyboards";
import type { BankSymbol } from "@/components/math/symbolBank";

// تجريد بسيط لغلاف $…$ (نسخة عميل خفيفة، بلا compute-engine).
function strip(s: string): string {
  let t = (s ?? "").trim();
  if (t.startsWith("$") && t.endsWith("$")) t = t.replace(/^\$+|\$+$/g, "");
  return t.trim();
}

export default function MathAnswerInput({
  value,
  onChange,
  layout = "math",
  disabled = false,
  customSymbols,
}: {
  value: string;
  onChange: (v: string) => void;
  layout?: MathLayout;
  disabled?: boolean;
  customSymbols?: BankSymbol[];
}) {
  return (
    <div className="space-y-1">
      <MathField
        value={strip(value)}
        onChange={(latex) => {
          const t = latex.trim();
          onChange(t ? `$${t}$` : "");
        }}
        layout={layout}
        disabled={disabled}
        customSymbols={customSymbols}
      />
      <p className="text-xs text-ink/50">
        اكتب إجابتك بلوحة المعادلات (مثل الكسور والجذور والأسس).
      </p>
    </div>
  );
}
