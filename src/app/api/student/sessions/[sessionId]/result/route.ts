// src/app/api/student/sessions/[sessionId]/result/route.ts
// GET: نتيجة الجلسة ومراجعتها كاملةً — تُكشف الإجابات الصحيحة بعد الانتهاء فقط.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/exam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }

  const exam = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    include: { quiz: { select: { title: true } } },
  });
  if (!exam || exam.studentId !== session.sub) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }
  if (exam.status === "IN_PROGRESS") {
    return NextResponse.json({ error: "الجلسة لم تنتهِ بعد" }, { status: 409 });
  }

  // عُقد الأسئلة بترتيب العرض (positionX تصاعدياً).
  const qNodes = await prisma.quizNode.findMany({
    where: { quizId: exam.quizId, nodeType: "QUESTION" },
    orderBy: { positionX: "asc" },
    include: {
      question: { include: { options: { orderBy: { orderNum: "asc" } } } },
    },
  });

  const answers = await prisma.studentAnswer.findMany({
    where: { sessionId: exam.id },
    include: { selectedOptions: { select: { id: true } } },
  });
  const answerByNode = new Map(answers.map((a) => [a.nodeId, a]));

  const items = qNodes.map((n, i) => {
    const q = n.question!;
    const ans = answerByNode.get(n.id);
    const selectedIds = new Set(ans?.selectedOptions.map((o) => o.id) ?? []);
    return {
      index: i + 1,
      type: q.type,
      content: q.content,
      points: Number(n.pointsOverride ?? q.points),
      scoreEarned: ans ? Number(ans.scoreEarned) : 0,
      isCorrect: ans?.isCorrect ?? false,
      answered: Boolean(ans),
      explanation: q.explanation ?? null,
      textAnswer: ans?.textAnswer ?? null,
      acceptedAnswers: q.type === "SHORT_ANSWER" ? q.acceptedAnswers : [],
      options: q.options.map((o) => ({
        id: o.id,
        label: o.label,
        content: o.content,
        isCorrect: o.isCorrect,
        selected: selectedIds.has(o.id),
      })),
    };
  });

  return NextResponse.json({
    quizTitle: exam.quiz.title,
    status: exam.status,
    totalScore: Number(exam.totalScore),
    maxPossibleScore: Number(exam.maxPossibleScore),
    percentage: Number(exam.percentage),
    items,
  });
}
