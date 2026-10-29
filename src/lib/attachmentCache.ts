// src/lib/attachmentCache.ts
// سياسة التخزين المؤقّت لبثّ المرفقات. دالة نقيّة (بلا prisma) لتُختبَر.

/** مدّة حفظ صورة السؤال في متصفّح صاحبها (ثوانٍ). قصيرة عمداً. */
export const QUESTION_IMAGE_MAX_AGE = 600;

/**
 * صور الأسئلة (توسيم الرسم) تُحفَظ قليلاً في متصفّح من فحصنا صلاحيته: استبدال الصورة ينشئ مرفقاً بمعرّف
 * جديد (فلا تبقى صورة قديمة بنفس الرابط)، و`private` يمنع أي ذاكرة وسيطة مشتركة، والفحص يتمّ عند كل جلب أوّل.
 * أوراق الاختبار وصور إجابات الطلاب (خصوصية القُصّر، وأجهزة قد تُشارَك) تبقى `no-store`.
 */
export function attachmentCacheControl(kind: string): string {
  return kind === "QUESTION_IMAGE"
    ? `private, max-age=${QUESTION_IMAGE_MAX_AGE}`
    : "private, no-store";
}
