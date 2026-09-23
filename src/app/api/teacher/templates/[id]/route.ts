// src/app/api/teacher/templates/[id]/route.ts
// DELETE: حذف قالب اختبار. (المدرّس المالك حصراً.)
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

  await prisma.quizTemplate.deleteMany({
    where: { id: params.id, teacherId: session.sub },
  });
  return NextResponse.json({ ok: true });
}
