// src/app/api/student/sessions/[sessionId]/skip/route.ts
// POST: تخطّي السؤال الحالي دون إجابة، والانتقال للسؤال غير المُجاب التالي.
// الأسئلة المتخطّاة تُؤجَّل لآخر الاختبار، ولا ينتهي إلا بالإجابة عن الكل.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getStudentSession,
  parseSettings,
  isExpired,
  finalizeSession,
  nextUnansweredNodeId,
  loadSanitizedQuestion,
  countQuestionNodes,
} from "@/lib/exam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ nodeId: z.string().min(1) });

export async function POST(
  req: Request,
  { params }: { params: { sessionId: string } }
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
  const { nodeId } = parsed.data;

  const exam = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    include: { quiz: true },
  });
  if (!exam || exam.studentId !== session.sub) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }
  if (exam.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "انتهت هذه الجلسة" }, { status: 409 });
  }

  const settings = parseSettings(exam.quiz.settings);
  if (isExpired(exam.startedAt, settings.timeLimitSec)) {
    await finalizeSession(exam.id, "TIMED_OUT");
    return NextResponse.json({ finished: true, expired: true });
  }

  if (exam.currentNodeId !== nodeId) {
    return NextResponse.json(
      { error: "هذا ليس السؤال الحالي" },
      { status: 409 }
    );
  }

  // السؤال غير المُجاب التالي مع استبعاد الحالي.
  const nextNode = await nextUnansweredNodeId(
    exam.quizId,
    exam.id,
    nodeId,
    true
  );

  // لا يوجد غيره: السؤال الحالي هو الوحيد المتبقّي — يجب الإجابة عنه.
  if (!nextNode) {
    return NextResponse.json({ sameNode: true });
  }

  await prisma.examSession.update({
    where: { id: exam.id },
    data: { currentNodeId: nextNode },
  });

  const total = await countQuestionNodes(exam.quizId);
  const answered = await prisma.studentAnswer.count({
    where: { sessionId: exam.id },
  });
  const next = await loadSanitizedQuestion(nextNode, answered + 1, total);
  return NextResponse.json({ next });
}
