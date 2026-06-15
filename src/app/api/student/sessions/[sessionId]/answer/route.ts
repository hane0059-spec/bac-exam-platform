// src/app/api/student/sessions/[sessionId]/answer/route.ts
// POST: استقبال إجابة، تصحيحها على الخادم، إنشاء سجلّ الإجابة، والتقدّم للسؤال التالي.
// تصحيح فوري: تُعاد صحّة الإجابة والشرح بعد كل سؤال (دون كشفها قبل الإرسال).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gradeOptionAnswer, gradeShortAnswer } from "@/lib/grading";
import {
  getStudentSession,
  parseSettings,
  isExpired,
  finalizeSession,
  nextQuestionNodeId,
  loadSanitizedQuestion,
  countQuestionNodes,
} from "@/lib/exam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  nodeId: z.string().min(1),
  optionIds: z.array(z.string()).optional().default([]),
  textAnswer: z.string().optional(),
});

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
  const { nodeId, optionIds, textAnswer } = parsed.data;

  const exam = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    include: { quiz: true },
  });
  // الملكية: الجلسة تخصّ هذا الطالب.
  if (!exam || exam.studentId !== session.sub) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }
  if (exam.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "انتهت هذه الجلسة" },
      { status: 409 }
    );
  }

  const settings = parseSettings(exam.quiz.settings);

  // فرض المهلة على الخادم.
  if (isExpired(exam.startedAt, settings.timeLimitSec)) {
    await finalizeSession(exam.id, "TIMED_OUT");
    return NextResponse.json({ finished: true, expired: true });
  }

  // يجب أن يُجاب السؤال الحالي فقط (لا تقديم/تكرار).
  if (exam.currentNodeId !== nodeId) {
    return NextResponse.json(
      { error: "هذا ليس السؤال الحالي" },
      { status: 409 }
    );
  }
  const already = await prisma.studentAnswer.findFirst({
    where: { sessionId: exam.id, nodeId },
    select: { id: true },
  });
  if (already) {
    return NextResponse.json(
      { error: "أُجيب هذا السؤال سابقاً" },
      { status: 409 }
    );
  }

  const node = await prisma.quizNode.findUnique({
    where: { id: nodeId },
    include: {
      question: { include: { options: { orderBy: { orderNum: "asc" } } } },
    },
  });
  if (!node || !node.question || node.quizId !== exam.quizId) {
    return NextResponse.json({ error: "سؤال غير صالح" }, { status: 404 });
  }
  const q = node.question;
  const points = Number(node.pointsOverride ?? q.points);

  // التصحيح على الخادم.
  let isCorrect: boolean;
  let connectOptionIds: string[] = [];
  if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
    const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
    const validSelected = optionIds.filter((id) =>
      q.options.some((o) => o.id === id)
    );
    connectOptionIds = validSelected;
    isCorrect = gradeOptionAnswer(correctIds, validSelected);
  } else if (q.type === "SHORT_ANSWER") {
    isCorrect = gradeShortAnswer(q.acceptedAnswers, textAnswer ?? "");
  } else {
    // أنواع أخرى لا تُصحَّح آلياً في هذه المرحلة.
    isCorrect = false;
  }
  const scoreEarned = isCorrect ? points : 0;

  // عقدة السؤال التالية (أو النهاية).
  const nextNode = await nextQuestionNodeId(exam.quizId, nodeId);
  const finished = nextNode === null;

  // كتابة الإجابة وتحديث الجلسة في معاملة واحدة.
  await prisma.$transaction([
    prisma.studentAnswer.create({
      data: {
        sessionId: exam.id,
        questionId: q.id,
        nodeId,
        textAnswer: textAnswer ?? null,
        isCorrect,
        scoreEarned,
        selectedOptions: connectOptionIds.length
          ? { connect: connectOptionIds.map((id) => ({ id })) }
          : undefined,
      },
    }),
    prisma.examSession.update({
      where: { id: exam.id },
      data: {
        currentNodeId: nextNode,
        pathTaken: { push: nodeId },
      },
    }),
  ]);

  if (finished) {
    await finalizeSession(exam.id, "COMPLETED");
  }

  // كشف التصحيح الفوري بعد الإرسال.
  const reveal = {
    isCorrect,
    scoreEarned,
    points,
    explanation: q.explanation ?? null,
    correctOptions:
      q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE"
        ? q.options
            .filter((o) => o.isCorrect)
            .map((o) => ({ id: o.id, label: o.label, content: o.content }))
        : [],
    acceptedAnswers: q.type === "SHORT_ANSWER" ? q.acceptedAnswers : [],
  };

  if (finished) {
    return NextResponse.json({ reveal, finished: true });
  }

  const total = await countQuestionNodes(exam.quizId);
  const answered = await prisma.studentAnswer.count({
    where: { sessionId: exam.id },
  });
  const next = await loadSanitizedQuestion(nextNode!, answered + 1, total);
  return NextResponse.json({ reveal, finished: false, next });
}
