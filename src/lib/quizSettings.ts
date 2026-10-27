// src/lib/quizSettings.ts
// إعدادات الاختبار المخزَّنة (نقيّ: بلا قاعدة بيانات) — يُعاد تصديرها من exam.ts.

export interface QuizSettings {
  timeLimitSec: number | null;
  maxAttempts: number;
  revealAnswers: "immediate" | "end";
  shuffle: boolean; // خلط ترتيب الأسئلة والخيارات لكل محاولة (نزاهة)
  // مراجعة الإجابات وتعديلها قبل التسليم النهائي — مشتقّة: true ⇔ revealAnswers === "end".
  reviewBeforeSubmit: boolean;
}

export function parseSettings(raw: unknown): QuizSettings {
  const s = (raw ?? {}) as Record<string, unknown>;
  return {
    timeLimitSec:
      typeof s.timeLimitSec === "number" && s.timeLimitSec > 0
        ? s.timeLimitSec
        : null,
    maxAttempts:
      typeof s.maxAttempts === "number" && s.maxAttempts > 0
        ? s.maxAttempts
        : 1,
    // التصحيح في نهاية الاختبار ⇒ للطالب مراجعة إجاباته وتعديلها قبل التسليم؛ والتصحيح الفوري بعد كل سؤال
    // ⇒ لا مراجعة (وإلا انكشف الصحيح قبل أن يعدّل إجابته). «reviewBeforeSubmit» القديم يُعامَل كـ«نهاية الاختبار».
    revealAnswers: revealEnd(s) ? "end" : "immediate",
    shuffle: s.shuffle === true,
    reviewBeforeSubmit: revealEnd(s),
  };
}

function revealEnd(s: Record<string, unknown>): boolean {
  return s.revealAnswers === "end" || s.reviewBeforeSubmit === true;
}

