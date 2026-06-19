// src/app/api/teacher/sessions/[id]/grade/route.ts
// POST: تصحيح المدرّس لإجابات (قصيرة/مقالية) وإعادة حساب درجة الجلسة. (مالك الاختبار.)
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { computeScore } from "@/lib/grading";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  grades: z
    .array(
      z.object({
        nodeId: z.string().min(1),
        scoreEarned: z.number().min(0),
        isCorrect: z.boolean(),
      })
    )
    .min(1),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const exam = await prisma.examSession.findUnique({
    where: { id: params.id },
    include: { quiz: { select: { creatorId: true } } },
  });
  if (!exam || exam.quiz.creatorId !== session.sub) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
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

  // عُقد الأسئلة لهذه الجلسة (للتحقّق والعلامات وحالة الإلغاء).
  const qNodes = await prisma.quizNode.findMany({
    where: { quizId: exam.quizId, nodeType: "QUESTION" },
    include: { question: { select: { points: true, isCancelled: true } } },
  });
  const pointsByNode = new Map(
    qNodes.map((n) => [n.id, Number(n.pointsOverride ?? n.question?.points ?? 0)])
  );
  const cancelledByNode = new Map(
    qNodes.map((n) => [n.id, n.question?.isCancelled ?? false])
  );

  // تحديث كل إجابة مُصحَّحة (مع حصر الدرجة ضمن علامة السؤال).
  for (const g of parsed.data.grades) {
    const max = pointsByNode.get(g.nodeId);
    if (max == null) continue;
    const score = Math.min(Math.max(0, g.scoreEarned), max);
    await prisma.studentAnswer.updateMany({
      where: { sessionId: exam.id, nodeId: g.nodeId },
      data: { scoreEarned: score, isCorrect: g.isCorrect, needsReview: false },
    });
  }

  // إعادة حساب درجة الجلسة من الدرجات الفعلية (تدعم الجزئي: 4 من 5 للمقالي).
  const answers = await prisma.studentAnswer.findMany({
    where: { sessionId: exam.id },
    select: { nodeId: true, isCorrect: true, scoreEarned: true },
  });
  const ansByNode = new Map(answers.map((a) => [a.nodeId, a]));
  const score = computeScore(
    qNodes.map((n) => {
      const a = ansByNode.get(n.id);
      return {
        points: pointsByNode.get(n.id) ?? 0,
        isCorrect: a?.isCorrect ?? false,
        earned: a ? Number(a.scoreEarned) : 0,
        isCancelled: cancelledByNode.get(n.id) ?? false,
      };
    })
  );
  await prisma.examSession.update({
    where: { id: exam.id },
    data: {
      totalScore: score.earned,
      maxPossibleScore: score.max,
      percentage: score.percentage,
    },
  });

  return NextResponse.json({ percentage: score.percentage });
}
