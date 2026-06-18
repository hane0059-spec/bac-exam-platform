// src/lib/settings.ts
// إعدادات المنصّة العامة (AppSetting) — الخطّ حالياً. قراءة مُجمَّعة لكل طلب.
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const FONT_OPTIONS = [
  { key: "cairo", label: "Cairo (افتراضي)" },
  { key: "tajawal", label: "Tajawal" },
  { key: "reem", label: "Reem Kufi" },
] as const;

export type FontKey = (typeof FONT_OPTIONS)[number]["key"];

const FONT_KEYS = FONT_OPTIONS.map((f) => f.key) as readonly string[];

function isFontKey(v: string | undefined): v is FontKey {
  return !!v && FONT_KEYS.includes(v);
}

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
