"use client";
// src/components/student/PrintButton.tsx
// زرّ طباعة النتيجة (حوار طباعة المتصفّح). تُخفى عناصر التنقّل عبر print:hidden.
export default function PrintButton({
  label = "طباعة النتيجة",
}: {
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light print:hidden"
    >
      🖨 {label}
    </button>
  );
}
