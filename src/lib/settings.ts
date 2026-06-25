// src/lib/settings.ts
// إعدادات المنصّة العامة (AppSetting) — الخطّ والوضع. قراءة مُجمَّعة لكل طلب.
// فهرس الخطوط في fonts.ts (آمن للعميل)؛ يُعاد تصديره للراحة في كود الخادم.
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { isFontKey, type FontKey } from "@/lib/fonts";

export { FONT_OPTIONS, FONT_CSS, FONT_KEYS, isFontKey, fontCss } from "@/lib/fonts";
export type { FontKey, FontKind } from "@/lib/fonts";

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
