// src/app/api/student/file-exams/sessions/[sessionId]/submit/route.ts
// POST: إرسال الإجابة للتصحيح. يلزم صفحة واحدة على الأقل. الطالب صاحب الجلسة.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession, finalizeFileSessionIfExpired } from "@/lib/exam";
import { parseFileExamSettings } from "@/lib/fileExam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { sessionId: string } },
) {
  const session = await getStudentSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const exam = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    select: {
      id: true,
      studentId: true,
      status: true,
      startedAt: true,
      quiz: { select: { isFileBased: true, settings: true } },
    },
  });
  if (!exam || exam.studentId !== session.sub || !exam.quiz.isFileBased)
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  if (exam.status !== "IN_PROGRESS")
    return NextResponse.json({ error: "أُرسلت هذه المحاولة" }, { status: 409 });
  // فرض المهلة: إن انتهى الوقت تُنهى الجلسة تلقائياً (إرسال ما رُفع، أو انتهاء وقت).
  if (await finalizeFileSessionIfExpired(exam.id)) {
    const after = await prisma.examSession.findUniqueOrThrow({
      where: { id: exam.id },
      select: { status: true },
    });
    return after.status === "COMPLETED"
      ? NextResponse.json({ ok: true, timedOut: true })
      : NextResponse.json({ error: "انتهى وقت الاختبار." }, { status: 409 });
  }

  const pages = await prisma.attachment.count({
    where: { sessionId: exam.id, kind: "ANSWER_UPLOAD" },
  });
  if (pages < 1)
    return NextResponse.json(
      { error: "ارفع صورة إجابتك قبل الإرسال." },
      { status: 422 },
    );

  const settings = parseFileExamSettings(exam.quiz.settings);
  const timeSpent = Math.floor((Date.now() - exam.startedAt.getTime()) / 1000);

  await prisma.examSession.update({
    where: { id: exam.id },
    data: {
      status: "COMPLETED",
      needsGrading: true, // بانتظار تصحيح المدرّس
      completedAt: new Date(),
      timeSpent,
      totalScore: 0,
      maxPossibleScore: settings.maxScore,
      percentage: 0,
    },
  });
  return NextResponse.json({ ok: true });
}
