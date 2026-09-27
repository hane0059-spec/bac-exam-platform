// src/app/api/teacher/enrichment/[id]/route.ts
// DELETE: حذف عنصر إثراء يملكه المدرّس نفسه فقط (teacherId = هو).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getTeacherSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  // الملكية داخل شرط الحذف نفسه: لا يحذف المدرّس إلا ما رفعه هو.
  const r = await prisma.enrichmentFile.deleteMany({
    where: { id: params.id, teacherId: session.sub },
  });
  if (r.count === 0)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
