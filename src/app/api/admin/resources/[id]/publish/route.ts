// src/app/api/admin/resources/[id]/publish/route.ts
// تبديل نشر عنصر إثراء مدرّس على الصفحة العامّة — بلا تكرار الملف: نفس الصفّ، فقط
// تبديل teacherId (الملكية الخاصّة) ↔ sourceTeacherId (أثر المصدر بعد النشر العام).
// المدير العام فقط.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getAdminContext();
  if (!ctx || !ctx.isSuper)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });

  const item = await prisma.enrichmentFile.findUnique({
    where: { id: params.id },
    select: { teacherId: true, sourceTeacherId: true },
  });
  if (!item) return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });

  if (item.teacherId) {
    await prisma.enrichmentFile.update({
      where: { id: params.id },
      data: { teacherId: null, sourceTeacherId: item.teacherId },
    });
    return NextResponse.json({ ok: true, published: true });
  }
  if (item.sourceTeacherId) {
    await prisma.enrichmentFile.update({
      where: { id: params.id },
      data: { teacherId: item.sourceTeacherId, sourceTeacherId: null },
    });
    return NextResponse.json({ ok: true, published: false });
  }
  return NextResponse.json(
    { error: "هذا المحتوى ليس من نشر مدرّس" },
    { status: 400 },
  );
}
