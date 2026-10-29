// src/app/api/student/sessions/[sessionId]/review/route.ts
// GET: قائمة أسئلة الجلسة بترتيب الطالب مع حالة كلٍّ (مُجاب/غير مُجاب) — لشاشة المراجعة.
// لا تحمل أي إجابة صحيحة ولا نصّ إجابات الطالب.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderedQuestionNodeIds, remainingSeconds } from "@/lib/exam";
import { loadReviewSession } from "@/lib/examReview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** مقتطف قصير من نصّ السؤال: بلا علامات الفراغات/المعادلات وبمسافات موحّدة. */
function snippet(content: string, max = 70): string {
  const t = content
    .replace(/\[\[\s*\]\]/g, "…")
    .replace(/\$+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max).trimEnd() + "…" : t;
}

export async function GET(_req: Request, props: { params: Promise<{ sessionId: string }> }) {
  const params = await props.params;
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
  // عنوان مختصر لكل سؤال (من نصّه) ليتعرّف عليه الطالب بلا حفظ رقمه؛ نصّ السؤال لا إجابته.
  const nodes = await prisma.quizNode.findMany({
    where: { id: { in: ids } },
    select: { id: true, question: { select: { content: true } } },
  });
  const titleOf = new Map(nodes.map((n) => [n.id, snippet(n.question?.content ?? "")]));
  return NextResponse.json({
    items: ids.map((nodeId, i) => ({
      nodeId,
      index: i + 1,
      answered: answered.has(nodeId),
      title: titleOf.get(nodeId) ?? "",
    })),
    timeRemainingSec: remainingSeconds(exam.startedAt, settings.timeLimitSec),
  });
}
