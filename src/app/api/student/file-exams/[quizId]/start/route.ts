// src/app/api/student/file-exams/[quizId]/start/route.ts
// POST: بدء (أو استئناف) جلسة اختبار ورقي. يتحقّق من الإسناد والنشر والنافذة والمحاولات.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession, isWithinWindow } from "@/lib/exam";
import { parseFileExamSettings } from "@/lib/fileExam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { quizId: string } },
) {
  const session = await getStudentSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  const studentId = session.sub;
  const { quizId } = params;

  const assignment = await prisma.quizAssignment.findFirst({
    where: { quizId, studentId, quiz: { status: "PUBLISHED" } },
    include: { quiz: true },
  });
  if (!assignment || !assignment.quiz.isFileBased) {
    return NextResponse.json({ error: "هذا الاختبار غير متاح لك" }, { status: 404 });
  }
  const quiz = assignment.quiz;

  if (!isWithinWindow(quiz.availableFrom, quiz.availableUntil)) {
    return NextResponse.json(
      { error: "هذا الاختبار خارج نافذة الإتاحة" },
      { status: 403 },
    );
  }

  // استئناف جلسة جارية إن وُجدت.
  const existing = await prisma.examSession.findFirst({
    where: { studentId, quizId, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ sessionId: existing.id });

  const settings = parseFileExamSettings(quiz.settings);
  const finishedCount = await prisma.examSession.count({
    where: { studentId, quizId, status: { in: ["COMPLETED", "TIMED_OUT"] } },
  });
  const maxAllowed = settings.maxAttempts + assignment.extraAttempts;
  if (finishedCount >= maxAllowed) {
    return NextResponse.json(
      { error: "استنفدت عدد المحاولات المسموح بها" },
      { status: 403 },
    );
  }

  const created = await prisma.examSession.create({
    data: {
      studentId,
      quizId,
      status: "IN_PROGRESS",
      attemptNumber: finishedCount + 1,
      pathTaken: [],
    },
    select: { id: true },
  });
  return NextResponse.json({ sessionId: created.id });
}
