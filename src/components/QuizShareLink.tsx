"use client";
// src/components/QuizShareLink.tsx
// رابط انضمام الاختبار (للمشاركة في واتساب/مجموعات) مع زرّ نسخ.
import { useState } from "react";

export default function QuizShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // المتصفّح لا يسمح بالنسخ: يبقى الرابط قابلاً للتحديد يدوياً.
    }
  }

  return (
    <div className="mt-3 flex w-full max-w-md items-center gap-2">
      <input
        readOnly
        dir="ltr"
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="field flex-1 text-xs"
        aria-label="رابط الاختبار"
      />
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-xl border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary-light"
      >
        {copied ? "تمّ النسخ ✓" : "نسخ الرابط"}
      </button>
    </div>
  );
}
