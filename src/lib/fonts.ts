// src/lib/fonts.ts
// فهرس خطوط المنصّة — آمن للعميل (لا prisma ولا cache). تستورده اللوحات
// (اختيار الخطّ) وكود الخادم (تطبيق المتغيّر). نوعان:
//  - "web": خطوط ويب مضمّنة عبر next/font (تظهر لكل الأجهزة).
//  - "system": خطوط نظام عربية (تظهر حسب توفّرها على جهاز الزائر، وإلا
//    يُستخدم خطّ ويب بديل تلقائياً عبر سلسلة الارتداد).

export type FontKind = "web" | "system";

interface FontOption {
  key: string;
  label: string;
  kind: FontKind;
  css: string; // قيمة font-family كاملة مع الارتداد
}

// خطوط الويب المضمّنة تُحمَّل في layout كمتغيّرات؛ وخطوط النظام ترتدّ إليها.
export const FONT_OPTIONS = [
  // ── خطوط ويب (تظهر للجميع) ──
  { key: "cairo", label: "Cairo — حديث (افتراضي)", kind: "web",
    css: "var(--font-cairo)" },
  { key: "tajawal", label: "Tajawal — حديث", kind: "web",
    css: "var(--font-tajawal)" },
  { key: "reem", label: "Reem Kufi — كوفي", kind: "web",
    css: "var(--font-reem)" },
  { key: "amiri", label: "Amiri — نسخ كلاسيكي", kind: "web",
    css: "var(--font-amiri)" },

  // ── خطوط نظام عربية (حسب جهاز الزائر) ──
  { key: "traditional", label: "Traditional Arabic — تقليدي", kind: "system",
    css: '"Traditional Arabic", "Arabic Typesetting", var(--font-amiri), serif' },
  { key: "arabic_typesetting", label: "Arabic Typesetting", kind: "system",
    css: '"Arabic Typesetting", var(--font-amiri), serif' },
  { key: "simplified", label: "Simplified Arabic — مبسّط", kind: "system",
    css: '"Simplified Arabic", "Simplified Arabic Fixed", var(--font-cairo), sans-serif' },
  { key: "majalla", label: "Sakkal Majalla — مجلّة", kind: "system",
    css: '"Sakkal Majalla", "Majalla UI", var(--font-cairo), sans-serif' },
  { key: "andalus", label: "Andalus — أندلس", kind: "system",
    css: 'Andalus, var(--font-amiri), serif' },
  { key: "tahoma", label: "Tahoma", kind: "system",
    css: 'Tahoma, var(--font-cairo), sans-serif' },
  { key: "segoe", label: "Segoe UI", kind: "system",
    css: '"Segoe UI", var(--font-cairo), sans-serif' },
  { key: "arial", label: "Arial", kind: "system",
    css: 'Arial, "Arial Unicode MS", var(--font-cairo), sans-serif' },
  { key: "times", label: "Times New Roman", kind: "system",
    css: '"Times New Roman", var(--font-tinos), var(--font-amiri), serif' },
  { key: "geeza", label: "Geeza Pro — (ماك)", kind: "system",
    css: '"Geeza Pro", var(--font-cairo), sans-serif' },
  { key: "damascus", label: "Damascus — دمشق (ماك)", kind: "system",
    css: 'Damascus, var(--font-cairo), sans-serif' },
  { key: "albayan", label: "Al Bayan — البيان (ماك)", kind: "system",
    css: '"Al Bayan", var(--font-amiri), serif' },
  { key: "notonaskh", label: "Noto Naskh Arabic", kind: "system",
    css: '"Noto Naskh Arabic", var(--font-amiri), serif' },
  { key: "notokufi", label: "Noto Kufi Arabic", kind: "system",
    css: '"Noto Kufi Arabic", var(--font-reem), sans-serif' },
] as const satisfies readonly FontOption[];

export type FontKey = (typeof FONT_OPTIONS)[number]["key"];

export const FONT_CSS: Record<FontKey, string> = Object.fromEntries(
  FONT_OPTIONS.map((f) => [f.key, f.css]),
) as Record<FontKey, string>;

export const FONT_KEYS: readonly string[] = FONT_OPTIONS.map((f) => f.key);

export function isFontKey(v: string | undefined): v is FontKey {
  return !!v && FONT_KEYS.includes(v);
}

/** قيمة font-family لمفتاح خطّ، أو ارتداد آمن إن كان غير معروف. */
export function fontCss(key: string | undefined, fallback = "var(--font-app)"): string {
  return key && key in FONT_CSS ? FONT_CSS[key as FontKey] : fallback;
}
