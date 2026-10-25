// src/app/api/student/sessions/[sessionId]/review/route.ts
// GET: قائمة أسئلة الجلسة بترتيب الطالب مع حالة كلٍّ (مُجاب/غير مُجاب) — لشاشة المراجعة.
// لا تحمل أي إجابة صحيحة ولا نصّ إجابات الطالب.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderedQuestionNodeIds, remainingSeconds } from "@/lib/exam";
import { loadReviewSession } from "@/lib/examReview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  const r = await loadReviewSession(params.sessionId);
  if ("error" in r) return r.error;
  const { exam, settings, seed } = r;

  const ids = await orderedQuestionNodeIds(exam.quizId, seed);
  const answered = new Set(
    (
      await prisma.studentAnswer.findMany({
        where: { sessionId: exam.id },
        select: { nodeId: true },
      })
    ).map((a) => a.nodeId)
  );
  return NextResponse.json({
    items: ids.map((nodeId, i) => ({
      nodeId,
      index: i + 1,
      answered: answered.has(nodeId),
    })),
    timeRemainingSec: remainingSeconds(exam.startedAt, settings.timeLimitSec),
  });
}
