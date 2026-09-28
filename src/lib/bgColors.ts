// src/lib/bgColors.ts
// فهرس ألوان خلفية المنصّة — آمن للعميل (بلا prisma/cache). يستهلك متغيّر
// --parchment (خلفية الصفحة، وراءها بطاقات بيضاء) في الوضع النهاري فقط؛
// الوضع الليلي والطباعة يبقيان بلا تخصيص (راجع layout.tsx وglobals.css).
export interface BgColorOption {
  key: string;
  label: string;
  rgb: string; // "R G B" — قيمة متغيّر --parchment
  swatch: string; // hex للمعاينة في لوحة الإعدادات فقط
}

export const BG_COLOR_OPTIONS = [
  { key: "default", label: "افتراضي", rgb: "239 242 241", swatch: "#EFF2F1" },
  { key: "blue", label: "أزرق فاتح", rgb: "219 234 254", swatch: "#DBEAFE" },
  { key: "green", label: "أخضر فاتح", rgb: "209 250 229", swatch: "#D1FAE5" },
  { key: "gray", label: "رمادي فاتح", rgb: "241 245 249", swatch: "#F1F5F9" },
  { key: "pink", label: "وردي فاتح", rgb: "252 231 243", swatch: "#FCE7F3" },
  { key: "purple", label: "بنفسجي فاتح", rgb: "237 233 254", swatch: "#EDE9FE" },
] as const satisfies readonly BgColorOption[];

export type BgColorKey = (typeof BG_COLOR_OPTIONS)[number]["key"];

export function isBgColorKey(v: unknown): v is BgColorKey {
  return typeof v === "string" && BG_COLOR_OPTIONS.some((o) => o.key === v);
}

export const BG_COLOR_RGB: Record<BgColorKey, string> = Object.fromEntries(
  BG_COLOR_OPTIONS.map((o) => [o.key, o.rgb]),
) as Record<BgColorKey, string>;
