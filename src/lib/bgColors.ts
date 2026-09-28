// src/lib/bgColors.ts
// خلفية المنصّة القابلة للتخصيص — لون واحد (H/L) بتشبّع ثابت، يُختار من تدرّج
// (لا قائمة ثابتة). آمن للعميل (بلا prisma/cache). يستهلك متغيّر --parchment
// (خلفية الصفحة، وراءها بطاقات بيضاء) في الوضع النهاري فقط؛ الوضع الليلي
// والطباعة يبقيان بلا تخصيص (راجع layout.tsx وglobals.css).
export const BG_SATURATION = 55; // % ثابتة لكل الاختيارات — تناسق ولطف بصري.
export const BG_HUE_MIN = 0;
export const BG_HUE_MAX = 359;
// حدّ أدنى للإضاءة يُبقي تبايناً مقروءاً مع نصّ الواجهة الداكن؛ حدٌّ أعلى قريب
// من الأبيض (يسمح بـ«أزرق أغمق» ونحوه دون الوصول لدرجة تُذهب وضوح القراءة).
export const BG_LIGHTNESS_MIN = 45;
export const BG_LIGHTNESS_MAX = 96;

export const BG_HUE_DEFAULT = 210; // أزرق
export const BG_LIGHTNESS_DEFAULT = 82;

export interface BgColorValue {
  h: number; // 0–359
  l: number; // BG_LIGHTNESS_MIN–BG_LIGHTNESS_MAX
}

export function isBgColorValue(v: unknown): v is BgColorValue {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.h === "number" &&
    Number.isInteger(o.h) &&
    o.h >= BG_HUE_MIN &&
    o.h <= BG_HUE_MAX &&
    typeof o.l === "number" &&
    Number.isInteger(o.l) &&
    o.l >= BG_LIGHTNESS_MIN &&
    o.l <= BG_LIGHTNESS_MAX
  );
}

/** hsl() جاهزة للمعاينة في الواجهة (سواتش/تدرّج) — بالتشبّع الثابت. */
export function bgColorToHslCss({ h, l }: BgColorValue): string {
  return `hsl(${h} ${BG_SATURATION}% ${l}%)`;
}

/** HSL (تشبّع ثابت) إلى قنوات RGB نصّية "R G B" — قيمة متغيّر --parchment. */
export function bgColorToRgb({ h, l }: BgColorValue): string {
  const s = BG_SATURATION / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = lNorm - c / 2;
  const toByte = (v: number) => Math.round((v + m) * 255);
  return `${toByte(r)} ${toByte(g)} ${toByte(b)}`;
}
