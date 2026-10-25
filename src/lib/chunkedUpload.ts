// src/lib/chunkedUpload.ts
// رفع ملفّات كبيرة على أجزاء: استضافة serverless (Vercel) ترفض أي طلب جسمه > ~4.5MB، فيقسّم
// المتصفّح الملفّ إلى أجزاء ≤3MB، ويخزّنها الخادم مؤقّتاً (AppSetting، بلا تغيير مخطط) ثم يجمعها
// عند الجزء الأخير. المفاتيح مُنطَّقة بمعرّف المستخدم فلا يقرأ أحدٌ أجزاء غيره.
import { prisma } from "@/lib/prisma";

export const CHUNK_BYTES = 3 * 1024 * 1024; // حجم الجزء في المتصفّح
export const MAX_CHUNK_BYTES = CHUNK_BYTES + 64 * 1024; // سقف يقبله الخادم لجزء واحد
export const MAX_CHUNKS = 6; // 6 × 3MB ≥ أقصى ملفّ (15MB)
const STALE_MS = 60 * 60 * 1000; // أجزاء ناقصة تُمحى بعد ساعة
const MAX_PENDING_PER_OWNER = 30;
const ID_RE = /^[A-Za-z0-9-]{8,64}$/;

const prefix = (owner: string, uploadId: string) => `upload:${owner}:${uploadId}:`;

export type UploadPayload =
  | { status: "error"; error: string }
  | { status: "partial" }
  | { status: "ready"; buffer: Buffer; name: string; type: string };

/** أجزاء مهجورة أقدم من ساعة (تُنفَّذ انتهازياً مع كل جزء). */
export async function purgeStaleChunks(now = new Date()): Promise<void> {
  await prisma.appSetting
    .deleteMany({
      where: {
        key: { startsWith: "upload:" },
        updatedAt: { lt: new Date(now.getTime() - STALE_MS) },
      },
    })
    .catch(() => {});
}

/**
 * يقرأ حمولة الرفع من نموذج الطلب: ملفّ كامل (مسار قديم) أو جزء من رفع مجزَّأ.
 * عند الجزء الأخير يجمع الأجزاء ويُعيد الملفّ الكامل؛ وما قبله `partial`.
 */
export async function readUploadPayload(
  form: FormData,
  ownerId: string
): Promise<UploadPayload> {
  const file = form.get("file");
  if (!(file instanceof File)) return { status: "error", error: "لا ملف مرفوع" };

  const uploadId = form.get("uploadId");
  // رفع غير مجزَّأ (ملفّ صغير).
  if (typeof uploadId !== "string" || !uploadId) {
    return {
      status: "ready",
      buffer: Buffer.from(await file.arrayBuffer()),
      name: file.name,
      type: file.type,
    };
  }

  const index = Number(form.get("index"));
  const total = Number(form.get("total"));
  const name = String(form.get("name") ?? file.name ?? "");
  const type = String(form.get("type") ?? "");
  if (
    !ID_RE.test(uploadId) ||
    !Number.isInteger(index) ||
    !Number.isInteger(total) ||
    total < 2 ||
    total > MAX_CHUNKS ||
    index < 0 ||
    index >= total
  ) {
    return { status: "error", error: "طلب رفع غير صالح" };
  }
  if (file.size === 0 || file.size > MAX_CHUNK_BYTES) {
    return { status: "error", error: "حجم الجزء غير صالح" };
  }

  await purgeStaleChunks();
  const pending = await prisma.appSetting.count({
    where: { key: { startsWith: `upload:${ownerId}:` } },
  });
  if (index === 0 && pending >= MAX_PENDING_PER_OWNER) {
    return { status: "error", error: "عمليات رفع كثيرة معلّقة، حاول بعد قليل." };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const key = `${prefix(ownerId, uploadId)}${index}`;
  const value = buf.toString("base64");
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  if (index < total - 1) return { status: "partial" };

  // الجزء الأخير: اجمع كل الأجزاء بالترتيب.
  const rows = await prisma.appSetting.findMany({
    where: { key: { startsWith: prefix(ownerId, uploadId) } },
  });
  const byIndex = new Map(
    rows.map((r) => [Number(r.key.slice(prefix(ownerId, uploadId).length)), r.value])
  );
  const parts: Buffer[] = [];
  for (let i = 0; i < total; i++) {
    const v = byIndex.get(i);
    if (v === undefined) {
      return { status: "error", error: "أجزاء الملفّ ناقصة — أعد الرفع." };
    }
    parts.push(Buffer.from(v, "base64"));
  }
  await prisma.appSetting.deleteMany({
    where: { key: { startsWith: prefix(ownerId, uploadId) } },
  });
  return { status: "ready", buffer: Buffer.concat(parts), name, type };
}

/** يمحو أجزاء رفعٍ فشل بعد جمعه (احتياط؛ الأجزاء تُمحى عند الجمع أصلاً). */
export async function discardChunks(ownerId: string, uploadId: string): Promise<void> {
  if (!ID_RE.test(uploadId)) return;
  await prisma.appSetting
    .deleteMany({ where: { key: { startsWith: prefix(ownerId, uploadId) } } })
    .catch(() => {});
}
