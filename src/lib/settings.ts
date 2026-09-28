// src/lib/settings.ts
// إعدادات المنصّة العامة (AppSetting) — الخطّ والوضع. قراءة مُجمَّعة لكل طلب.
// فهرس الخطوط في fonts.ts (آمن للعميل)؛ يُعاد تصديره للراحة في كود الخادم.
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { isFontKey, type FontKey } from "@/lib/fonts";
import { isBgColorValue, clampBgColorValue, type BgColorValue } from "@/lib/bgColors";

export { FONT_OPTIONS, FONT_CSS, FONT_KEYS, isFontKey, fontCss } from "@/lib/fonts";
export type { FontKey, FontKind } from "@/lib/fonts";
export {
  BG_SATURATION,
  BG_HUE_MIN,
  BG_HUE_MAX,
  BG_LIGHTNESS_MIN,
  BG_LIGHTNESS_MAX,
  BG_HUE_DEFAULT,
  BG_LIGHTNESS_DEFAULT,
  isBgColorValue,
  bgColorToRgb,
  bgColorToHslCss,
} from "@/lib/bgColors";
export type { BgColorValue } from "@/lib/bgColors";

/** خطّ المنصّة الحالي (افتراضي cairo). مُجمَّع خلال الطلب الواحد. */
export const getAppFont = cache(async (): Promise<FontKey> => {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: "font" } });
    if (isFontKey(row?.value)) return row!.value as FontKey;
  } catch {
    // عند غياب الجدول/الاتصال: الافتراضي.
  }
  return "cairo";
});

export async function setAppFont(value: FontKey): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: "font" },
    update: { value },
    create: { key: "font", value },
  });
}

/** لون خلفية المنصّة المخصَّص (null = بلا تخصيص، يبقى اللون المحايد الافتراضي). */
export const getAppBgColor = cache(async (): Promise<BgColorValue | null> => {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: "bg_color" } });
    if (row?.value) {
      const parsed: unknown = JSON.parse(row.value);
      // يُثبِّت قيماً قديمة خارج الحدود الحالية (بعد تشديدها) بدل رفضها كليّاً.
      const clamped = clampBgColorValue(parsed);
      if (clamped) return clamped;
    }
  } catch {
    // عند غياب الجدول/الاتصال أو قيمة تالفة: بلا تخصيص.
  }
  return null;
});

/** null يمسح التخصيص ويعيد اللون المحايد الافتراضي. */
export async function setAppBgColor(value: BgColorValue | null): Promise<void> {
  if (value === null) {
    await prisma.appSetting.deleteMany({ where: { key: "bg_color" } });
    return;
  }
  const json = JSON.stringify(value);
  await prisma.appSetting.upsert({
    where: { key: "bg_color" },
    update: { value: json },
    create: { key: "bg_color", value: json },
  });
}

// ─────────────────────────────────────────────
// وضع المنصّة: "full" متعدّد المؤسّسات، أو "solo" مبسّط
// (مدير منصّة + مدرّسون مستقلّون فقط). يتحكّم به المدير العام من الإعدادات.
// ─────────────────────────────────────────────
export type PlatformMode = "full" | "solo";

export const PLATFORM_MODE_OPTIONS = [
  { key: "full", label: "كامل (متعدّد المؤسّسات)" },
  { key: "solo", label: "مبسّط (مدرّسون مستقلّون فقط)" },
] as const;

/** وضع المنصّة الحالي (افتراضي full). مُجمَّع خلال الطلب الواحد. */
export const getPlatformMode = cache(async (): Promise<PlatformMode> => {
  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: "platform_mode" },
    });
    if (row?.value === "solo") return "solo";
  } catch {
    // عند غياب الجدول/الاتصال: الافتراضي.
  }
  return "full";
});

/** اختصار: هل المنصّة في الوضع المبسّط؟ */
export async function isSoloMode(): Promise<boolean> {
  return (await getPlatformMode()) === "solo";
}

export async function setPlatformMode(value: PlatformMode): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: "platform_mode" },
    update: { value },
    create: { key: "platform_mode", value },
  });
}
