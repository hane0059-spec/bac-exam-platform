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
// ملء الفراغات (FILL_BLANK)
// ─────────────────────────────────────────────

// علامة الفراغ في نصّ القالب: [[ ]] أو [[تلميح]]. المصدر نصّيّ لإنشاء RegExp جديد
// عند كل استعمال (تفادياً لحالة lastIndex المشتركة مع الراية g).
const FILL_MARKER_SRC = "\\[\\[[^\\]]*\\]\\]";
// فاصل المترادفات المقبولة داخل خانة الفراغ الواحد.
const FILL_BLANK_SEP = "|";

/** يقسّم نصّ القالب إلى أجزاء نصّية حول الفراغات؛ عدد الفراغات = الأجزاء − 1. */
export function splitFillTemplate(content: string): string[] {
  return content.split(new RegExp(FILL_MARKER_SRC, "g"));
}

/** عدد الفراغات في نصّ القالب. */
export function countBlanks(content: string): number {
  const m = content.match(new RegExp(FILL_MARKER_SRC, "g"));
  return m ? m.length : 0;
}

/** يستبدل كل علامة فراغ برمز عرض (افتراضياً خطّ سفليّ) للطباعة/المراجعة. */
export function fillTemplateForDisplay(
  content: string,
  blankToken = "______"
): string {
  return content.replace(new RegExp(FILL_MARKER_SRC, "g"), blankToken);
}

/** الإجابات المقبولة لفراغ واحد من تخزينها النصّي (مفصولة بـ |). */
export function parseBlankAnswers(stored: string): string[] {
  return stored
    .split(FILL_BLANK_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * تصحيح ملء الفراغات: لكل فراغ قائمةُ إجاباته المقبولة، ولإجابة الطالب نصُّها.
 * يُطبَّق التطبيع العربي ومطابقةٌ دقيقة لكل فراغ مستقلّاً، ويُعاد عددُ الفراغات
 * الصحيحة من إجماليها لدعم الدرجة الجزئية (مثل 2 من 3).
 */
export function gradeFillBlank(
  blanks: readonly (readonly string[])[],
  studentAnswers: readonly (string | null | undefined)[]
): { correctCount: number; total: number } {
  const total = blanks.length;
  let correctCount = 0;
  for (let i = 0; i < total; i++) {
    if (gradeShortAnswer(blanks[i], studentAnswers[i])) correctCount++;
  }
  return { correctCount, total };
}

// ─────────────────────────────────────────────
// المطابقة (MATCHING)
// ─────────────────────────────────────────────

/**
 * تصحيح المطابقة: لكل عنصر أيسر إجابته الصحيحة (العنصر الأيمن المقابل)،
 * وإجابة الطالب اختيارُه. مطابقة دقيقة بعد التطبيع العربي، بدرجة جزئية.
 */
export function gradeMatching(
  correctRights: readonly string[],
  studentRights: readonly (string | null | undefined)[]
): { correctCount: number; total: number } {
  const total = correctRights.length;
  let correctCount = 0;
  for (let i = 0; i < total; i++) {
    const chosen = normalizeArabic(studentRights[i] ?? "");
    if (chosen && chosen === normalizeArabic(correctRights[i])) correctCount++;
  }
  return { correctCount, total };
}

// ─────────────────────────────────────────────
// الحساب (CALCULATION) — إجابة عددية بهامش خطأ اختياري
// ─────────────────────────────────────────────

/**
 * يحوّل نصّاً إلى عدد: أرقام عربية/فارسية → لاتينية، فاصلة عشرية عربية «٫» → نقطة،
 * وإزالة الفواصل الألفية والمسافات. يعيد null لغير العددي.
 */
export function parseNumber(input: string | null | undefined): number | null {
  if (input == null) return null;
  let s = normalizeArabic(String(input)); // يحوّل الأرقام العربية ويقلّم المسافات
  s = s
    .replace(/٫/g, ".") // الفاصلة العشرية العربية
    .replace(/[٬,]/g, "") // الفاصلة الألفية العربية واللاتينية
    .replace(/\s+/g, "");
  if (s === "" || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * تصحيح سؤال الحساب: `accepted[0]` القيمة الصحيحة، و`accepted[1]` هامش الخطأ
 * المسموح (±، اختياري). صحيح إذا كان الفرق المطلق ضمن الهامش.
 */
export function gradeCalculation(
  accepted: readonly string[],
  studentAnswer: string | null | undefined
): boolean {
  const value = parseNumber(accepted[0]);
  const tol = parseNumber(accepted[1] ?? "0") ?? 0;
  const ans = parseNumber(studentAnswer);
  if (value == null || ans == null) return false;
  return Math.abs(ans - value) <= Math.abs(tol);
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
