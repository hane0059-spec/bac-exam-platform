// src/app/api/teacher/file-exams/sessions/[sessionId]/grade/route.ts
// POST: تصحيح محاولة ورقية (درجة + ملاحظة). المدرّس مالك الاختبار حصراً. قابل للتعديل.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { gradeFileSchema, parseFileExamSettings } from "@/lib/fileExam";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } },
) {
  const session = await getTeacherSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const exam = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    select: {
      id: true,
      status: true,
      needsGrading: true,
      studentId: true,
      quizId: true,
      quiz: {
        select: {
          creatorId: true,
          isFileBased: true,
          settings: true,
          title: true,
        },
      },
    },
  });
  if (!exam || exam.quiz.creatorId !== session.sub || !exam.quiz.isFileBased)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (exam.status !== "COMPLETED")
    return NextResponse.json(
      { error: "لم تُرسَل هذه المحاولة بعد." },
      { status: 409 },
    );

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = gradeFileSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const max = parseFileExamSettings(exam.quiz.settings).maxScore;
  const score = parsed.data.score;
  if (score > max)
    return NextResponse.json(
      { error: `الدرجة تتجاوز القصوى (${max}).` },
      { status: 422 },
    );

  const percentage = Math.round((score / max) * 100);

  await prisma.examSession.update({
    where: { id: exam.id },
    data: {
      totalScore: score,
      maxPossibleScore: max,
      percentage,
      teacherFeedback: parsed.data.feedback || null,
      needsGrading: false,
    },
  });

  // إشعار الطالب عند أوّل تصحيح فقط (لا يتكرّر عند التعديل).
  if (exam.needsGrading) {
    await createNotification({
      userId: exam.studentId,
      type: "GRADED",
      message: `تم تصحيح اختبارك «${exam.quiz.title}» — ${percentage}%`,
      linkUrl: `/student/quizzes/${exam.quizId}`,
    });
  }

  return NextResponse.json({ ok: true });
}
