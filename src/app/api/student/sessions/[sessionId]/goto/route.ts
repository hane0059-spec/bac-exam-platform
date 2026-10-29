// src/app/api/student/sessions/[sessionId]/goto/route.ts
// POST: انتقال لسؤال بعينه (شاشة المراجعة) مع إجابة الطالب السابقة عنه إن وُجدت.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  orderedQuestionNodeIds,
  loadSanitizedQuestion,
  loadPreviousAnswer,
} from "@/lib/exam";
import { loadReviewSession } from "@/lib/examReview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ nodeId: z.string().min(1) });

export async function POST(req: Request, props: { params: Promise<{ sessionId: string }> }) {
  const params = await props.params;
  const r = await loadReviewSession(params.sessionId);
  if ("error" in r) return r.error;
  const { exam, seed } = r;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const { nodeId } = parsed.data;

  // السؤال يجب أن يكون من أسئلة هذا الاختبار.
  const ids = await orderedQuestionNodeIds(exam.quizId, seed);
  const pos = ids.indexOf(nodeId);
  if (pos < 0) {
    return NextResponse.json({ error: "سؤال غير صالح" }, { status: 404 });
  }

  await prisma.examSession.update({
    where: { id: exam.id },
    data: { currentNodeId: nodeId },
  });
  const question = await loadSanitizedQuestion(
    nodeId,
    pos + 1,
    ids.length,
    seed ? `${seed}:${nodeId}` : undefined
  );
  if (!question) {
    return NextResponse.json({ error: "سؤال غير صالح" }, { status: 404 });
  }
  const previous = await loadPreviousAnswer(exam.id, nodeId);
  return NextResponse.json({ question: { ...question, previous } });
}
