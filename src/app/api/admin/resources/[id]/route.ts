// src/app/api/admin/resources/[id]/route.ts
// DELETE: حذف ملفّ «أسئلة وإثراء» عامّ. المدير العام فقط.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { clearRequest } from "@/lib/enrichmentRequest";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ctx = await getAdminContext();
  if (!ctx || !ctx.isSuper)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });

  // نقرأ صاحب العنصر قبل الحذف لنُعلمه (مدرّس رفعه خاصّاً، أو مدرّس اعتُمد منشوره للعامّ).
  const file = await prisma.enrichmentFile.findUnique({
    where: { id: params.id },
    select: { title: true, teacherId: true, sourceTeacherId: true },
  });
  await prisma.enrichmentFile.deleteMany({ where: { id: params.id } });
  await clearRequest(params.id); // طلب نشر معلّق على العنصر المحذوف (إن وُجد)
  const ownerId = file?.teacherId ?? file?.sourceTeacherId;
  if (file && ownerId) {
    // فشل الإشعار لا يكسر الحذف.
    await createNotification({
      userId: ownerId,
      type: "enrichment_deleted",
      message: `حذف المدير عنصراً من مكتبتك في «أسئلة وإثراء»: «${file.title}» (لتفريغ مساحة التخزين).`,
      linkUrl: "/teacher/enrichment",
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
