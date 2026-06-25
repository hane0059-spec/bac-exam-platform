// src/app/api/teacher/quizzes/[id]/assignments/attempts/route.ts
// POST: منح محاولة إضافية لطالب (grant) أو تصفير محاولاته لهذا الاختبار (reset).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { ownedQuiz } from "@/lib/teacherQuiz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  studentId: z.string().min(1),
  action: z.enum(["grant", "reset"]),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const quiz = await ownedQuiz(session.sub, params.id);
  if (!quiz) {
    return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const { studentId, action } = parsed.data;

  const assignment = await prisma.quizAssignment.findFirst({
    where: { quizId: quiz.id, studentId },
  });
  if (!assignment) {
    return NextResponse.json(
      { error: "الطالب غير مُسنَد لهذا الاختبار" },
      { status: 404 }
    );
  }

  // لا منح/تصفير أثناء جلسة جارية للطالب.
  const inProgress = await prisma.examSession.count({
    where: { quizId: quiz.id, studentId, status: "IN_PROGRESS" },
  });
  if (inProgress > 0) {
    return NextResponse.json(
      { error: "الطالب يؤدّي الاختبار حالياً" },
      { status: 409 }
    );
  }

  if (action === "grant") {
    // منح محاولة إضافية مع الحفاظ على النتائج السابقة.
    const updated = await prisma.quizAssignment.update({
      where: { id: assignment.id },
      data: { extraAttempts: { increment: 1 } },
    });
    return NextResponse.json({ extraAttempts: updated.extraAttempts });
  }

  // تصفير: حذف جلسات الطالب وإجاباتها لهذا الاختبار + إعادة المحاولات الإضافية للصفر.
  const sessions = await prisma.examSession.findMany({
    where: { quizId: quiz.id, studentId },
    select: { id: true },
  });
  const ids = sessions.map((s) => s.id);

  // منع التصفير إن كان هناك اعتراض مفتوح — الطالب بانتظار ردّ المدرّس.
  if (ids.length > 0) {
    const openAppeals = await prisma.gradeAppeal.count({
      where: { sessionId: { in: ids }, status: "OPEN" },
    });
    if (openAppeals > 0) {
      return NextResponse.json(
        { error: "لا يمكن التصفير: يوجد اعتراض مفتوح على إحدى الجلسات" },
        { status: 409 }
      );
    }
  }

  await prisma.$transaction([
    prisma.studentAnswer.deleteMany({ where: { sessionId: { in: ids } } }),
    prisma.examSession.deleteMany({ where: { quizId: quiz.id, studentId } }),
    prisma.quizAssignment.update({
      where: { id: assignment.id },
      data: { extraAttempts: 0 },
    }),
  ]);
  return NextResponse.json({ reset: true });
}
