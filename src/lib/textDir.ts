// src/lib/textDir.ts
// كشف الأسئلة الإنكليزية لعرضها بشكل إنكليزي (تسميات A/B/C، True/False، اتجاه LTR).
// آمن للعميل (بلا prisma). عرضيّ فقط — التصحيح بمعرّفات الخيارات لا بنصّها.

const LATIN = /[A-Za-z]/g;
const ARABIC = /[\u0600-\u06FF]/g;
const ARABIC_LABELS = new Set(["أ", "ب", "ج", "د", "هـ", "و"]);

/** نصّ لاتيني غالب (أحرف لاتينية أكثر من العربية). */
export function isLatinText(s: string | null | undefined): boolean {
  if (!s) return false;
  const l = (s.match(LATIN) ?? []).length;
  const a = (s.match(ARABIC) ?? []).length;
  return l > 0 && l > a;
}

interface QLike {
  type: string;
  content: string;
  options: { content: string }[];
}

/**
 * السؤال إنكليزي؟ يُقدَّر من نصّه وخياراته (خيارات صح/خطأ المخزَّنة بالعربية
 * لا تُحتسَب حتى لا تُرجِّح العربية على سؤال إنكليزي).
 */
export function isLatinQuestion(q: QLike): boolean {
  const parts =
    q.type === "TRUE_FALSE"
      ? [q.content]
      : [q.content, ...q.options.map((o) => o.content)];
  return isLatinText(parts.join(" "));
}

/** الاختبار إنكليزي إن كانت أغلبية أسئلته إنكليزية. */
export function isLatinExam(questions: QLike[]): boolean {
  if (questions.length === 0) return false;
  const n = questions.filter(isLatinQuestion).length;
  return n * 2 > questions.length;
}

/** تسمية الخيار: أ/ب/ج → A/B/C في السؤال الإنكليزي. */
export function displayOptionLabel(
  label: string,
  index: number,
  latin: boolean
): string {
  if (latin && ARABIC_LABELS.has(label)) return String.fromCharCode(65 + index);
  return label;
}

/** نصّ الخيار: «صح/خطأ» → True/False في سؤال صح/خطأ إنكليزي. */
export function displayOptionContent(
  content: string,
  type: string,
  latin: boolean
): string {
  if (latin && type === "TRUE_FALSE") {
    if (content.trim() === "صح") return "True";
    if (content.trim() === "خطأ" || content.trim() === "خطا") return "False";
  }
  return content;
}
