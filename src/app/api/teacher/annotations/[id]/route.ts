// src/app/api/teacher/annotations/[id]/route.ts
// DELETE: حذف تعليق. الكاتب أو مالك الاختبار.
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
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const ann = await prisma.annotation.findUnique({
    where: { id: params.id },
    select: {
      authorId: true,
      attachment: {
        select: { session: { select: { quiz: { select: { creatorId: true } } } } },
      },
    },
  });
  if (!ann) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (
    ann.authorId !== session.sub &&
    ann.attachment.session?.quiz.creatorId !== session.sub
  )
    return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });

  await prisma.annotation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
