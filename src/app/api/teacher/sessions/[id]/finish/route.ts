// src/app/api/teacher/sessions/[id]/finish/route.ts
// POST: المدرّس يُنهي جلسة طالب عالقة «قيد الأداء» ويُعطيه نتيجته من إجاباته حتى آخر نشاط/الموعد النهائي.
// الحراسة: مدرّس فعّال مالك الاختبار، والجلسة قيد الأداء وعالقة (بعد الموعد النهائي بساعة، أو بلا موعد: ساعة بلا نشاط).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { parseSettings, finalizeSession } from "@/lib/exam";
import { isStaleSession, staleEndedAt } from "@/lib/staleSession";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }

  const exam = await prisma.examSession.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      status: true,
      studentId: true,
      startedAt: true,
      quiz: {
        select: {
          title: true,
          creatorId: true,
          isFileBased: true,
          settings: true,
          availableUntil: true,
        },
      },
      answers: { select: { answeredAt: true }, orderBy: { answeredAt: "desc" }, take: 1 },
    },
  });
  // الملكية: الاختبار للمدرّس نفسه.
  if (!exam || exam.quiz.creatorId !== session.sub) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }
  if (exam.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "هذه الجلسة منتهية أصلاً" }, { status: 409 });
  }
  if (exam.quiz.isFileBased) {
    return NextResponse.json(
      { error: "الاختبار الورقي يُنهى من صفحة «الإجابات والتصحيح»" },
      { status: 400 }
    );
  }

  const input = {
    startedAt: exam.startedAt,
    lastActivity: exam.answers[0]?.answeredAt ?? null,
    timeLimitSec: parseSettings(exam.quiz.settings).timeLimitSec,
    availableUntil: exam.quiz.availableUntil,
  };
  if (!isStaleSession(input)) {
    return NextResponse.json(
      { error: "الطالب ما زال نشطاً أو ضمن وقت الاختبار — يمكنك إنهاء جلسته بعد مرور ساعة على انتهاء وقته أو على آخر نشاط له." },
      { status: 409 }
    );
  }

  const updated = await finalizeSession(exam.id, "TIMED_OUT", staleEndedAt(input));
  if (!updated) {
    return NextResponse.json({ error: "تعذّر إنهاء الجلسة" }, { status: 500 });
  }
  try {
    await createNotification({
      userId: exam.studentId,
      type: "session_closed",
      message: `أنهى مدرّسك اختبار «${exam.quiz.title}» وحسب نتيجتك من إجاباتك.`,
      linkUrl: "/student/quizzes",
    });
  } catch {
    // فشل الإشعار لا يكسر الإنهاء.
  }
  return NextResponse.json({
    ok: true,
    percentage: Number(updated.percentage),
    totalScore: Number(updated.totalScore),
    maxPossibleScore: Number(updated.maxPossibleScore),
  });
}
