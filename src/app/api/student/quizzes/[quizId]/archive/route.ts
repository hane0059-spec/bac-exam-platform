// src/app/api/student/quizzes/[quizId]/archive/route.ts
// POST: أرشفة/إلغاء أرشفة الطالب لاختبار مُسنَد إليه (عرضيّ — يخفيه من قائمته النشطة).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/exam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ archived: z.boolean() });

export async function POST(
  req: Request,
  { params }: { params: { quizId: string } }
) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const { archived } = parsed.data;

  // الملكية: الإسناد يخصّ هذا الطالب.
  const assignment = await prisma.quizAssignment.findFirst({
    where: { quizId: params.quizId, studentId: session.sub },
    select: { id: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  }

  // لا تُؤرشَف إلا بعد إنهاء محاولة (ليبقى ما في القائمة النشطة قابلاً للأداء).
  if (archived) {
    const finished = await prisma.examSession.count({
      where: {
        studentId: session.sub,
        quizId: params.quizId,
        status: { in: ["COMPLETED", "TIMED_OUT"] },
      },
    });
    if (finished === 0) {
      return NextResponse.json(
        { error: "لا يمكن أرشفة اختبار لم تنهِه بعد" },
        { status: 409 }
      );
    }
  }

  await prisma.quizAssignment.update({
    where: { id: assignment.id },
    data: { studentArchivedAt: archived ? new Date() : null },
  });
  return NextResponse.json({ archived });
}
