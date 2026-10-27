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
