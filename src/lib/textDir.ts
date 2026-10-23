// src/lib/textDir.ts
// كشف لغة محتوى الأسئلة (عربي/إنكليزي/فرنسي/روسي) لعرضها بشكل مناسب: اتجاه LTR وتسميات
// الخيارات (A/B/C أو А/Б/В) وصح/خطأ بلغة الاختبار. آمن للعميل (بلا prisma). عرضيّ فقط —
// التصحيح بمعرّفات الخيارات لا بنصّها.

export type Lang = "ar" | "en" | "fr" | "ru";

const LATIN = /[A-Za-z]/g;
const CYRILLIC = /[Ѐ-ӿ]/g;
const ARABIC = /[؀-ۿ]/g;
const ARABIC_LABELS = new Set(["أ", "ب", "ج", "د", "هـ", "و"]);

const FR_ACCENTS = /[àâçéèêëîïôùûüœæ]/gi;
const FR_WORDS =
  /\b(le|la|les|des|une|un|est|et|que|qui|dans|pour|pas|sont|ce|du|au|aux|avec|quel|quelle|quels|quelles|sur|par|ou|nous|vous|ils)\b/gi;
const EN_WORDS =
  /\b(the|is|are|of|and|to|in|that|which|what|this|with|for|was|were|will|it|you|he|she|they|do|does)\b/gi;

type Script = "latin" | "cyrillic" | "arabic" | null;

function count(s: string, re: RegExp): number {
  return (s.match(re) ?? []).length;
}

function dominantScript(s: string | null | undefined): Script {
  if (!s) return null;
  const l = count(s, LATIN);
  const c = count(s, CYRILLIC);
  const a = count(s, ARABIC);
  const max = Math.max(l, c, a);
  if (max === 0) return null;
  if (max === c) return "cyrillic";
  if (max === l) return "latin";
  return "arabic";
}

/** لغة مادة من اسمها (إنكليزي/فرنسي/روسي) أو null. */
export function subjectLang(name: string | null | undefined): Lang | null {
  if (!name) return null;
  if (/إنجليز|إنكليز|انجليز|انكليز|english/i.test(name)) return "en";
  if (/فرنس|french|fran[cç]ais/i.test(name)) return "fr";
  if (/روس|russian|русск/i.test(name)) return "ru";
  return null;
}

/** تمييز الفرنسي من الإنكليزي لنصّ لاتيني (تلميح بالحروف المعلّمة والكلمات الشائعة). */
function latinLang(text: string): "en" | "fr" {
  const fr = count(text, FR_ACCENTS) + count(text, FR_WORDS);
  const en = count(text, EN_WORDS);
  return fr > en ? "fr" : "en";
}

interface QLike {
  type: string;
  content: string;
  options: { content: string }[];
}

function questionText(q: QLike): string {
  // خيارات صح/خطأ المخزَّنة بالعربية لا تُحتسَب حتى لا تُرجِّح العربية.
  return q.type === "TRUE_FALSE"
    ? q.content
    : [q.content, ...q.options.map((o) => o.content)].join(" ");
}

/**
 * لغة السؤال: السكربت يحسم الروسي (سيريلي) والعربي؛ واللاتيني يتبع `hint`
 * (لغة المادة: en/fr) إن وُجد وإلا يُقدَّر بالكلمات.
 */
export function questionLang(q: QLike, hint?: Lang | null): Lang {
  const text = questionText(q);
  const sc = dominantScript(text);
  if (sc === "cyrillic") return "ru";
  if (sc === "latin") return hint === "en" || hint === "fr" ? hint : latinLang(text);
  return "ar";
}

/** لغة الاختبار: الأكثر تكراراً بين الأسئلة غير العربية إن زادت عن النصف، وإلا العربية. */
export function examLang(questions: QLike[], subjectName?: string | null): Lang {
  if (questions.length === 0) return "ar";
  const hint = subjectLang(subjectName);
  const langs = questions.map((q) => questionLang(q, hint));
  const nonAr = langs.filter((l) => l !== "ar");
  if (nonAr.length * 2 <= langs.length) return "ar";
  const freq = new Map<Lang, number>();
  for (const l of nonAr) freq.set(l, (freq.get(l) ?? 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

const RU_LETTERS = ["А", "Б", "В", "Г", "Д", "Е"];

/** حرف الخيار الافتراضي حسب اللغة وموضعه. */
export function defaultOptionLetter(index: number, lang: Lang): string {
  if (lang === "ru") return RU_LETTERS[index] ?? String(index + 1);
  if (lang === "ar") return String.fromCharCode(0x0627 + index);
  return String.fromCharCode(65 + index);
}

/** تسمية الخيار: أ/ب/ج → A/B/C (أو А/Б/В) في السؤال غير العربي. */
export function displayOptionLabel(label: string, index: number, lang: Lang): string {
  if (lang !== "ar" && ARABIC_LABELS.has(label)) return defaultOptionLetter(index, lang);
  return label;
}

const TF: Record<Exclude<Lang, "ar">, { t: string; f: string }> = {
  en: { t: "True", f: "False" },
  fr: { t: "Vrai", f: "Faux" },
  ru: { t: "Верно", f: "Неверно" },
};

/** نصّ الخيار: «صح/خطأ» → True/False أو Vrai/Faux أو Верно/Неверно بلغة السؤال. */
export function displayOptionContent(content: string, type: string, lang: Lang): string {
  if (lang !== "ar" && type === "TRUE_FALSE") {
    const c = content.trim();
    if (c === "صح") return TF[lang].t;
    if (c === "خطأ" || c === "خطا") return TF[lang].f;
  }
  return content;
}
