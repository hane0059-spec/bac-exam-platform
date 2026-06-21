// src/lib/mathAnswer.ts
// إشارة «الإجابة معادلة رياضية» لأسئلة الإجابة القصيرة: وسمٌ على السؤال
// (بلا تغيير مخطط) يفعّل لوحة إدخال الطالب الرياضية والتصحيح بالتكافؤ الرمزي.
// ملفّ نقيّ (بلا compute-engine) ليُستورَد في العميل والخادم معاً.
export const MATH_ANSWER_TAG = "معادلة";

export function isMathAnswer(tags: readonly string[] | null | undefined): boolean {
  return !!tags?.includes(MATH_ANSWER_TAG);
}

/** يضيف/يزيل وسم المعادلة من قائمة وسوم. */
export function withMathAnswerTag(
  tags: readonly string[],
  enabled: boolean
): string[] {
  const without = tags.filter((t) => t !== MATH_ANSWER_TAG);
  return enabled ? [...without, MATH_ANSWER_TAG] : without;
}
