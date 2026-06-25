// src/app/api/student/reports/route.ts
// POST: بلاغ طالب عن خطأ في سؤال (من جلسته)، ويُشعَر المدرّس المُنشئ.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/exam";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  sessionId: z.string().min(1),
  nodeId: z.string().min(1),
  reason: z.string().trim().min(3, "اكتب وصفاً للمشكلة").max(500),
});

export async function POST(req: Request) {
  const session = await getStudentSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // الملكية: الجلسة لهذا الطالب وجارية الآن (البلاغ أثناء الأداء فقط).
  const exam = await prisma.examSession.findUnique({
    where: { id: d.sessionId },
    select: { studentId: true, quizId: true, status: true },
  });
  if (!exam || exam.studentId !== session.sub || exam.status !== "IN_PROGRESS")
    return NextResponse.json({ error: "جلسة غير صالحة أو منتهية" }, { status: 403 });

  const node = await prisma.quizNode.findUnique({
    where: { id: d.nodeId },
    select: {
      quizId: true,
      questionId: true,
      question: { select: { creatorId: true, content: true } },
    },
  });
  if (!node || node.quizId !== exam.quizId || !node.questionId || !node.question)
    return NextResponse.json({ error: "سؤال غير صالح" }, { status: 400 });

  // منع تكرار البلاغ المفتوح من الطالب نفسه على السؤال نفسه.
  const dup = await prisma.questionReport.findFirst({
    where: {
      questionId: node.questionId,
      studentId: session.sub,
      status: "OPEN",
    },
    select: { id: true },
  });
  if (dup)
    return NextResponse.json({ ok: true, already: true });

  await prisma.questionReport.create({
    data: {
      questionId: node.questionId,
      studentId: session.sub,
      sessionId: d.sessionId,
      reason: d.reason,
    },
  });

  // إشعار المدرّس المُنشئ للسؤال.
  await createNotification({
    userId: node.question.creatorId,
    type: "REPORT",
    message: `بلاغ عن خطأ في سؤال: «${node.question.content.slice(0, 40)}…»`,
    linkUrl: "/teacher/reports",
  });

  return NextResponse.json({ ok: true });
}
