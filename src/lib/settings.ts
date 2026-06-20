// src/lib/settings.ts
// إعدادات المنصّة العامة (AppSetting) — الخطّ حالياً. قراءة مُجمَّعة لكل طلب.
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const FONT_OPTIONS = [
  { key: "cairo", label: "Cairo (افتراضي)" },
  { key: "tajawal", label: "Tajawal" },
  { key: "reem", label: "Reem Kufi" },
  { key: "traditional", label: "Traditional Arabic (تقليدي)" },
  { key: "times", label: "Times New Roman" },
] as const;

export type FontKey = (typeof FONT_OPTIONS)[number]["key"];

// قيمة CSS لـ font-family لكل خيار. للخطوط النظامية (تايمز/التقليدي) نضع
// الخطّ النظامي أولاً ثم بديلاً من الويب (Tinos/Amiri) يُحمَّل لكل الأجهزة.
export const FONT_CSS: Record<FontKey, string> = {
  cairo: "var(--font-cairo)",
  tajawal: "var(--font-tajawal)",
  reem: "var(--font-reem)",
  traditional:
    '"Traditional Arabic", "Arabic Typesetting", var(--font-amiri), serif',
  times: '"Times New Roman", var(--font-tinos), var(--font-amiri), serif',
};

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
