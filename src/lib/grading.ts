// src/lib/grading.ts
// محرّك التصحيح — دوال نقيّة (بلا قاعدة بيانات) ليسهُل اختبارها آلياً.
// يغطّي: التطبيع العربي، تصحيح الأسئلة (اختيار/صح-خطأ/قصيرة)، وإعادة حساب الدرجة.
// القاعدة المثبّتة: مطابقة دقيقة لا جزئية، والدرجة نسبة من «الأسئلة الصالحة».

// ─────────────────────────────────────────────
// 1) التطبيع العربي
// ─────────────────────────────────────────────

// التشكيل وعلامات قرآنية متفرّقة (U+0610–U+061A, U+064B–U+065F, U+0670, U+06D6–U+06ED).
const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
// التطويل (الكشيدة) U+0640.
const TATWEEL = /ـ/g;
// الأرقام العربية (U+0660–U+0669) والفارسية (U+06F0–U+06F9).
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

// رقم عربي/فارسي مفرد → لاتيني.
function latinDigit(d: string): string {
  const code = d.charCodeAt(0);
  const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
  return String(code - base);
}

/**
 * تطبيع نصّ عربي للمقارنة الدقيقة:
 * - إزالة التشكيل والتطويل
 * - توحيد الهمزات/الألف: آ أ إ ٱ → ا
 * - الألف المقصورة ى → ي، التاء المربوطة ة → ه
 * - الهمزة على الواو/الياء: ؤ → و، ئ → ي
 * - توحيد الأرقام، تصغير الأحرف اللاتينية، وضغط المسافات.
 * لا يُجرى أي حذف لـ «ال» التعريف حفاظاً على دقّة المطابقة.
 */
export function normalizeArabic(input: string): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(TASHKEEL, "")
    .replace(TATWEEL, "")
    .replace(/[آأإٱ]/g, "ا") // آ أ إ ٱ → ا
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/ئ/g, "ي") // ئ → ي
    .replace(ARABIC_DIGITS, latinDigit)
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────────────
// 2) تصحيح الأسئلة
// ─────────────────────────────────────────────

/**
 * تصحيح سؤال قائم على الخيارات (اختيار من متعدد / صح-خطأ).
 * صحيح فقط إذا طابقت مجموعةُ خيارات الطالب مجموعةَ الخيارات الصحيحة تماماً
 * (لا ناقصة ولا زائدة) — يدعم الإجابات متعددة الصواب.
 */
export function gradeOptionAnswer(
  correctOptionIds: readonly string[],
  selectedOptionIds: readonly string[]
): boolean {
  const correct = new Set(correctOptionIds);
  const selected = new Set(selectedOptionIds);
  if (correct.size === 0 || correct.size !== selected.size) return false;
  for (const id of selected) {
    if (!correct.has(id)) return false;
  }
  return true;
}

/**
 * تصحيح الإجابة القصيرة: تطبيع عربي ثم مطابقة دقيقة لأيٍّ من الإجابات المقبولة.
 * المطابقة كاملة لا جزئية: «نواة» لا تطابق «النواة».
 */
export function gradeShortAnswer(
  acceptedAnswers: readonly string[],
  studentAnswer: string | null | undefined
): boolean {
  const answer = normalizeArabic(studentAnswer ?? "");
  if (!answer) return false;
  return acceptedAnswers.some((a) => normalizeArabic(a) === answer);
}

/**
 * تصحيح سؤال الترتيب: صحيح فقط إذا طابق تسلسلُ خيارات الطالب التسلسلَ الصحيح
 * تماماً (نفس العناصر وبنفس الترتيب).
 */
export function gradeOrderAnswer(
  correctOrderedIds: readonly string[],
  studentOrderedIds: readonly string[]
): boolean {
  if (correctOrderedIds.length === 0) return false;
  if (correctOrderedIds.length !== studentOrderedIds.length) return false;
  for (let i = 0; i < correctOrderedIds.length; i++) {
    if (correctOrderedIds[i] !== studentOrderedIds[i]) return false;
  }
  return true;
}

// ─────────────────────────────────────────────
// 3) إعادة حساب الدرجة (نسبة من «الأسئلة الصالحة»)
// ─────────────────────────────────────────────

export interface ScorableItem {
  points: number; // علامة السؤال (بعد أي تجاوز)
  isCorrect: boolean;
  // الدرجة الفعلية المكتسبة (تدعم الجزئي، مثل 4 من 5 للمقالي). تُحصَر في [0, points].
  // عند غيابها: ثنائي = isCorrect ? points : 0 (توافق رجعي).
  earned?: number;
  isCancelled?: boolean; // سؤال مُلغى يُستبعد من البسط والمقام معاً
}

export interface ScoreResult {
  earned: number; // مجموع علامات الإجابات الصحيحة الصالحة
  max: number; // مجموع علامات الأسئلة الصالحة
  percentage: number; // 0..100 بمنزلتين عشريتين
}

/**
 * يحسب الدرجة كنسبة من الأسئلة الصالحة فقط؛ الأسئلة المُلغاة تُستبعد كلياً
 * فتُعاد الحسبة بأمان عند إلغاء سؤال. عند انعدام الأسئلة الصالحة → النسبة 0.
 */
export function computeScore(items: readonly ScorableItem[]): ScoreResult {
  let earned = 0;
  let max = 0;
  for (const item of items) {
    if (item.isCancelled) continue;
    max += item.points;
    const got =
      item.earned != null
        ? Math.min(Math.max(0, item.earned), item.points) // درجة جزئية محصورة
        : item.isCorrect
          ? item.points
          : 0;
    earned += got;
  }
  const percentage = max > 0 ? Math.round((earned / max) * 10000) / 100 : 0;
  return { earned, max, percentage };
}
