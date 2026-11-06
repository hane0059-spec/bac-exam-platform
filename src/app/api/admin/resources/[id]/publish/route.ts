// src/app/api/admin/resources/[id]/publish/route.ts
// تبديل نشر عنصر إثراء مدرّس على الصفحة العامّة — بلا تكرار الملف: نفس الصفّ، فقط
// تبديل teacherId (الملكية الخاصّة) ↔ sourceTeacherId (أثر المصدر بعد النشر العام).
// المدير العام فقط.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { clearRequest } from "@/lib/enrichmentRequest";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ctx = await getAdminContext();
  if (!ctx || !ctx.isSuper)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });

  const item = await prisma.enrichmentFile.findUnique({
    where: { id: params.id },
    select: { teacherId: true, sourceTeacherId: true, title: true },
  });
  if (!item) return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });

  if (item.teacherId) {
    await prisma.enrichmentFile.update({
      where: { id: params.id },
      data: { teacherId: null, sourceTeacherId: item.teacherId },
    });
    await clearRequest(params.id); // الطلب تحقّق
    // إشعار المدرّس بالنتيجة (فشله لا يكسر الاعتماد).
    await createNotification({
      userId: item.teacherId,
      type: "enrichment_published",
      message: `اعتمد المدير العام نشر «${item.title.slice(0, 80)}» على صفحة «أسئلة وإثراء» العامّة.`,
      linkUrl: "/teacher/enrichment",
    }).catch(() => {});
    return NextResponse.json({ ok: true, published: true });
  }
  if (item.sourceTeacherId) {
    await prisma.enrichmentFile.update({
      where: { id: params.id },
      data: { teacherId: item.sourceTeacherId, sourceTeacherId: null },
    });
    await createNotification({
      userId: item.sourceTeacherId,
      type: "enrichment_unpublished",
      message: `أُعيد «${item.title.slice(0, 80)}» إلى مكتبتك الخاصّة ولم يعد ظاهراً في الصفحة العامّة.`,
      linkUrl: "/teacher/enrichment",
    }).catch(() => {});
    return NextResponse.json({ ok: true, published: false });
  }
  return NextResponse.json(
    { error: "هذا المحتوى ليس من نشر مدرّس" },
    { status: 400 },
  );
}
