// src/app/api/teacher/questions/[id]/cancel/route.ts
// POST: إلغاء/إلغاء إلغاء سؤال (عند خطأ فيه) + إعادة حساب درجات الجلسات المتأثّرة.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { recomputeSessionScore } from "@/lib/exam";
import { createNotifications } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ isCancelled: z.boolean() });

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getTeacherSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const question = await prisma.question.findUnique({
    where: { id: params.id },
    select: { id: true, creatorId: true, content: true },
  });
  if (!question || question.creatorId !== session.sub)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  await prisma.question.update({
    where: { id: question.id },
    data: { isCancelled: parsed.data.isCancelled },
  });

  // الجلسات المنتهية على اختبارات تضمّ هذا السؤال → إعادة الحساب.
  const nodes = await prisma.quizNode.findMany({
    where: { questionId: question.id, nodeType: "QUESTION" },
    select: { quizId: true },
  });
  const quizIds = [...new Set(nodes.map((n) => n.quizId))];
  const sessions = quizIds.length
    ? await prisma.examSession.findMany({
        where: {
          quizId: { in: quizIds },
          status: { in: ["COMPLETED", "TIMED_OUT"] },
        },
        select: { id: true, studentId: true },
      })
    : [];
  for (const s of sessions) await recomputeSessionScore(s.id);

  // عند الإلغاء: عالِج البلاغات المفتوحة على السؤال، وأشعِر الطلاب المتأثّرين.
  if (parsed.data.isCancelled) {
    await prisma.questionReport.updateMany({
      where: { questionId: question.id, status: "OPEN" },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    const studentIds = [...new Set(sessions.map((s) => s.studentId))];
    await createNotifications(
      studentIds.map((studentId) => ({
        userId: studentId,
        type: "RECOMPUTED",
        message: `أُلغي سؤال في «${question.content.slice(0, 40)}…» وأُعيد حساب درجتك.`,
        linkUrl: "/student/quizzes",
      })),
    );
  }

  return NextResponse.json({ ok: true, recomputed: sessions.length });
}
