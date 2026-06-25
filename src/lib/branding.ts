// src/lib/branding.ts
// هوية المنصّة وواجهة الدخول — دوال قاعدة البيانات (خادم فقط).
// الأنواع والثوابت الآمنة للعميل في brandingShared.ts (لا تستورد هذا الملف من
// مكوّن عميل — يحوي prisma و cache).
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_BRANDING,
  mergeBranding,
  type Branding,
} from "@/lib/brandingShared";

// إعادة تصدير للراحة في كود الخادم.
export {
  DEFAULT_BRANDING,
  QUOTE_SIZE_CLASS,
  mergeBranding,
} from "@/lib/brandingShared";
export type {
  Branding,
  QuoteSize,
  NoticeType,
  WindowsLayout,
} from "@/lib/brandingShared";

/** هوية المنصّة الحالية. مُجمَّعة خلال الطلب الواحد. */
export const getBranding = cache(async (): Promise<Branding> => {
  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: "branding" },
    });
    if (!row?.value) return { ...DEFAULT_BRANDING };
    return mergeBranding(JSON.parse(row.value));
  } catch {
    // عند غياب الجدول/الاتصال أو JSON تالف: الافتراضي.
    return { ...DEFAULT_BRANDING };
  }
});

export async function setBranding(value: Branding): Promise<void> {
  const clean = mergeBranding(value);
  const json = JSON.stringify(clean);
  await prisma.appSetting.upsert({
    where: { key: "branding" },
    update: { value: json },
    create: { key: "branding", value: json },
  });
}

/** يحدّث حقولاً محدّدة فقط (مثل hasLogo بعد رفع/حذف الشعار). */
export async function patchBranding(partial: Partial<Branding>): Promise<void> {
  const current = await getBranding();
  await setBranding({ ...current, ...partial });
}

// ─────────────────────────────────────────────
// صورة الشعار المرفوعة (data URL في AppSetting)
// تُقرأ فقط من مسار البثّ العام — لا تُحمَّل مع getBranding.
// ─────────────────────────────────────────────
export async function getBrandingLogo(): Promise<{
  mimeType: string;
  data: Buffer;
} | null> {
  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: "branding_logo" },
    });
    if (!row?.value) return null;
    const m = /^data:([^;]+);base64,(.+)$/s.exec(row.value);
    if (!m) return null;
    return { mimeType: m[1], data: Buffer.from(m[2], "base64") };
  } catch {
    return null;
  }
}

export async function setBrandingLogo(
  mimeType: string,
  data: Buffer,
): Promise<void> {
  const dataUrl = `data:${mimeType};base64,${data.toString("base64")}`;
  await prisma.appSetting.upsert({
    where: { key: "branding_logo" },
    update: { value: dataUrl },
    create: { key: "branding_logo", value: dataUrl },
  });
  await patchBranding({ hasLogo: true });
}

export async function clearBrandingLogo(): Promise<void> {
  await prisma.appSetting.deleteMany({ where: { key: "branding_logo" } });
  await patchBranding({ hasLogo: false });
}
