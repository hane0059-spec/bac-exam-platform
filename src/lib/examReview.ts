// src/lib/examReview.ts
// حراسة مشتركة لمسارات وضع «مراجعة الإجابات قبل التسليم النهائي»:
// الجلسة جلسة هذا الطالب، قيد الأداء، واختبارها يفعّل المراجعة، والمهلة (من الخادم) لم تنتهِ.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getStudentSession,
  parseSettings,
  isExpired,
  finalizeSession,
  attemptSeed,
} from "@/lib/exam";

export async function loadReviewSession(sessionId: string) {
  const session = await getStudentSession();
  if (!session) {
    return { error: NextResponse.json({ error: "غير مخوّل" }, { status: 401 }) };
  }
  const exam = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { quiz: true },
  });
  if (!exam || exam.studentId !== session.sub) {
    return { error: NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 }) };
  }
  if (exam.status !== "IN_PROGRESS") {
    return { error: NextResponse.json({ error: "انتهت هذه الجلسة" }, { status: 409 }) };
  }
  const settings = parseSettings(exam.quiz.settings);
  if (!settings.reviewBeforeSubmit) {
    return {
      error: NextResponse.json({ error: "المراجعة غير مفعّلة لهذا الاختبار" }, { status: 409 }),
    };
  }
  if (isExpired(exam.startedAt, settings.timeLimitSec)) {
    await finalizeSession(exam.id, "TIMED_OUT");
    return { error: NextResponse.json({ finished: true, expired: true }) };
  }
  const seed = settings.shuffle
    ? attemptSeed(exam.studentId, exam.quizId, exam.attemptNumber)
    : undefined;
  return { exam, settings, seed };
}
