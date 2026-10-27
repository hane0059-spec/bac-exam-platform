// src/lib/printLayout.ts
// قواعد تخطيط الورقة المطبوعة لتوفير الورق.

/**
 * هل خيارات الاختيار من متعدد قصيرة بما يكفي لتُعرَض كلّها في سطر واحد؟
 * (حتى 5 خيارات، كل خيار ≤ 28 حرفاً، ومجموع الأسطر ≤ 78 حرفاً تقريباً بما فيه الحرف والفاصل).
 */
export function optionsFitOneLine(options: { content: string }[]): boolean {
  if (options.length === 0 || options.length > 5) return false;
  let total = 0;
  for (const o of options) {
    const len = o.content.replace(/\s+/g, " ").trim().length;
    if (len > 28) return false;
    total += len + 5; // + الحرف والفاصل
  }
  return total <= 78;
}

/**
 * في وضع «ضغط أكبر» (عمودان): الأسئلة التي يضيق بها نصف الصفحة تُعرَض بعرض كامل —
 * المطابقة (جدولان متقابلان)، توسيم الرسم (صورة)، والاختيار من متعدد ذو الخيارات الطويلة (شبكة عمودين).
 */
export function needsFullWidth(q: {
  type: string;
  options: { content: string }[];
}): boolean {
  if (q.type === "MATCHING" || q.type === "DIAGRAM_LABEL") return true;
  if (q.type === "MULTIPLE_CHOICE" && !optionsFitOneLine(q.options)) {
    return q.options.some((o) => o.content.length > 40);
  }
  return false;
}
