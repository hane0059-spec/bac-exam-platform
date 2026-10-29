// src/lib/certIssue.ts
// «تصميم الشهادة المُصدَرة»: ما اختاره المدرّس (النموذج/ألوان العلم/الشعار/عبارة الختام) عند إشعار الطالب،
// يُحفَظ في AppSetting (بلا تغيير مخطط) ليرى الطالب شهادته بالتصميم نفسه دون أن يختار شيئاً بنفسه.
// المفتاح لكل (اختبار، طالب) فلا يصل الطالب إلا إلى شهادته.
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_FLAG_COLORS,
  EMBLEMS,
  themeById,
  type CertThemeId,
  type EmblemId,
} from "@/lib/certificateArt";

export interface IssuedStyle {
  theme: CertThemeId;
  flag: [string, string, string];
  emblem: EmblemId | null;
  closing: string;
  /** شعار مرفوع (data URL مصغَّر) — يرسله المدرّس من جهازه فقط عند الاختيار «شعاري». */
  logo: string | null;
}

const HEX = /^#[0-9a-f]{6}$/i;
export const MAX_LOGO_CHARS = 260_000;

export const issuedStyleSchema = z.object({
  theme: z.string().max(30),
  flag: z.tuple([z.string().regex(HEX), z.string().regex(HEX), z.string().regex(HEX)]).optional(),
  emblem: z.string().max(20).nullable().optional(),
  closing: z.string().trim().max(90).optional(),
  logo: z
    .string()
    .max(MAX_LOGO_CHARS)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
    .nullable()
    .optional(),
});

/** يحقّق ويُطبّع تصميماً قادماً من العميل أو من التخزين؛ null إن كان غير صالح. */
export function normalizeIssuedStyle(raw: unknown): IssuedStyle | null {
  const p = issuedStyleSchema.safeParse(raw);
  if (!p.success) return null;
  const d = p.data;
  const emblem = EMBLEMS.some((e) => e.id === d.emblem) ? (d.emblem as EmblemId) : null;
  return {
    theme: themeById(d.theme).id,
    flag: d.flag ?? DEFAULT_FLAG_COLORS,
    emblem,
    closing: d.closing ?? "",
    logo: d.logo ?? null,
  };
}

export const issuedKey = (quizId: string, studentId: string) => `cert-issue:${quizId}:${studentId}`;

export async function saveIssuedStyle(quizId: string, studentId: string, style: IssuedStyle): Promise<void> {
  const key = issuedKey(quizId, studentId);
  const value = JSON.stringify(style);
  await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/** تصميم موحَّد لكل طلاب الاختبار (إشعار جماعي): صفّ واحد بدل نسخ الشعار لكل طالب. */
export const issuedAllKey = (quizId: string) => `cert-issue-all:${quizId}`;

/**
 * يحفظ تصميماً موحَّداً للاختبار ويمحو التصاميم الفردية للطلاب المذكورين (بمفاتيح صريحة من معرّفاتهم)
 * ليسري الموحَّد عليهم. تصميم فرديّ لطالب آخر لم يُذكر يبقى له.
 */
export async function saveIssuedStyleForQuiz(
  quizId: string,
  style: IssuedStyle,
  studentIds: string[]
): Promise<void> {
  const key = issuedAllKey(quizId);
  const value = JSON.stringify(style);
  await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  if (studentIds.length > 0) {
    await prisma.appSetting.deleteMany({
      where: { key: { in: studentIds.map((id) => issuedKey(quizId, id)) } },
    });
  }
}

async function readStyle(key: string): Promise<IssuedStyle | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row) return null;
  try {
    return normalizeIssuedStyle(JSON.parse(row.value));
  } catch {
    return null;
  }
}

/** تصميم الطالب الفردي أولاً، وإلا التصميم الموحَّد للاختبار (إن أُشعِر الطلاب جماعياً). */
export async function loadIssuedStyle(quizId: string, studentId: string): Promise<IssuedStyle | null> {
  return (await readStyle(issuedKey(quizId, studentId))) ?? (await readStyle(issuedAllKey(quizId)));
}
