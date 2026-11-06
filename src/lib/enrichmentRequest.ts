// src/lib/enrichmentRequest.ts
// «طلب نشر على الصفحة العامّة» لمحتوى إثراء المدرّس: المدرّس يطلب، والمدير العام يرى المطلوب فقط (بدل كل
// منشورات المدرّسين). بلا تغيير مخطط: كل طلب صفّ في AppSetting بمفتاح `enrich-req:{fileId}` (القيمة وقت الطلب).
import { prisma } from "@/lib/prisma";

const PREFIX = "enrich-req:";
export const requestKey = (fileId: string) => `${PREFIX}${fileId}`;

/** معرّفات العناصر المطلوب نشرها (للمدير: كلّها؛ وللمدرّس: يمرّر معرّفات عناصره لتقييد القراءة). */
export async function listRequestedIds(among?: string[]): Promise<Set<string>> {
  if (among && among.length === 0) return new Set();
  const rows = await prisma.appSetting.findMany({
    where: among
      ? { key: { in: among.map(requestKey) } }
      : { key: { startsWith: PREFIX } },
    select: { key: true },
  });
  return new Set(rows.map((r) => r.key.slice(PREFIX.length)));
}

/** يُنشئ الطلب إن لم يوجد؛ يعيد true إن كان جديداً (لإشعار المدير مرّة لا عند كل نقرة). */
export async function createRequest(fileId: string): Promise<boolean> {
  const key = requestKey(fileId);
  const existing = await prisma.appSetting.findUnique({ where: { key }, select: { key: true } });
  if (existing) return false;
  await prisma.appSetting.create({ data: { key, value: new Date().toISOString() } }).catch(() => {});
  return true;
}

export async function clearRequest(fileId: string): Promise<void> {
  await prisma.appSetting.deleteMany({ where: { key: requestKey(fileId) } });
}
