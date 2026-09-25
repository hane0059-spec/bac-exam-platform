// src/app/api/teacher/sessions/[id]/feedback/route.ts
// POST: ملاحظة المدرّس على نتيجة الطالب (تشجيع/إعادة/توجيه) — تظهر بجانب النتيجة
// للطالب ووليّ أمره، ويُشعَر الطالب. الملكية: مالك اختبار الجلسة. بلا تغيير مخطط
// (يعيد استخدام ExamSession.teacherFeedback).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  // فارغ = حذف الملاحظة.
  feedback: z.string().trim().max(1000, "الملاحظة أطول من 1000 حرف"),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getTeacherSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

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

  const exam = await prisma.examSession.findUnique({
    where: { id: params.id },
    select: {
      studentId: true,
      status: true,
      teacherFeedback: true,
      quizId: true,
      quiz: { select: { creatorId: true, title: true } },
    },
  });
  if (!exam || exam.quiz.creatorId !== session.sub) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }
  if (exam.status === "IN_PROGRESS") {
    return NextResponse.json({ error: "المحاولة لم تنتهِ بعد" }, { status: 409 });
  }

  const feedback = parsed.data.feedback || null;
  await prisma.examSession.update({
    where: { id: params.id },
    data: { teacherFeedback: feedback },
  });

  // إشعار الطالب عند إضافة/تغيير ملاحظة (لا عند الحذف أو التكرار).
  if (feedback && feedback !== exam.teacherFeedback) {
    try {
      await createNotification({
        userId: exam.studentId,
        type: "teacher_feedback",
        message: `أضاف مدرّسك ملاحظة على نتيجتك في «${exam.quiz.title}».`,
        linkUrl: `/student/quizzes/${exam.quizId}`,
      });
    } catch {
      // تجاهل.
    }
  }
  return NextResponse.json({ ok: true });
}
