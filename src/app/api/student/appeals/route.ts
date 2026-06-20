// src/app/api/student/appeals/route.ts
// POST: اعتراض الطالب على نتيجة تصحيح يدوي. يُنشئ GradeAppeal (OPEN) ويُشعر المدرّس.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/exam";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// الأنواع ذات التصحيح اليدوي (يجوز الاعتراض على نتيجتها).
const MANUAL_TYPES = ["ESSAY", "SHORT_ANSWER", "FILL_BLANK"];

const bodySchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().trim().min(5, "اذكر سبب الاعتراض (5 أحرف على الأقل)"),
});

export async function POST(req: Request) {
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const { sessionId, reason } = parsed.data;

  const exam = await prisma.examSession.findUnique({
    where: { id: sessionId },
    select: {
      studentId: true,
      status: true,
      needsGrading: true,
      quizId: true,
      quiz: { select: { creatorId: true, title: true, isFileBased: true } },
      answers: {
        select: { needsReview: true, question: { select: { type: true } } },
      },
      student: { select: { firstName: true, lastName: true } },
    },
  });
  // الملكية: الجلسة تخصّ هذا الطالب.
  if (!exam || exam.studentId !== session.sub) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }
  if (exam.status !== "COMPLETED" && exam.status !== "TIMED_OUT") {
    return NextResponse.json(
      { error: "لا يمكن الاعتراض قبل انتهاء المحاولة" },
      { status: 409 }
    );
  }

  // يجب أن يتضمّن الاختبار تصحيحاً يدويّاً، وأن يكون قد صُحِّح فعلاً.
  const isManual =
    exam.quiz.isFileBased ||
    exam.answers.some((a) => MANUAL_TYPES.includes(a.question?.type ?? ""));
  if (!isManual) {
    return NextResponse.json(
      { error: "هذا الاختبار مُصحَّح آلياً — لا يقبل الاعتراض" },
      { status: 422 }
    );
  }
  const stillPending = exam.quiz.isFileBased
    ? exam.needsGrading
    : exam.answers.some((a) => a.needsReview);
  if (stillPending) {
    return NextResponse.json(
      { error: "النتيجة بانتظار تصحيح المدرّس — لا اعتراض قبل اعتمادها" },
      { status: 409 }
    );
  }

  // اعتراض مفتوح واحد لكل جلسة.
  const open = await prisma.gradeAppeal.findFirst({
    where: { sessionId, status: "OPEN" },
    select: { id: true },
  });
  if (open) {
    return NextResponse.json(
      { error: "لديك اعتراض مفتوح على هذه النتيجة قيد المراجعة" },
      { status: 409 }
    );
  }

  await prisma.gradeAppeal.create({
    data: { sessionId, studentId: session.sub, reason },
  });

  // إشعار المدرّس مالك الاختبار.
  try {
    const name = `${exam.student.firstName} ${exam.student.lastName}`;
    await createNotification({
      userId: exam.quiz.creatorId,
      type: "appeal_opened",
      message: `اعترض «${name}» على نتيجة «${exam.quiz.title}» — بانتظار مراجعتك.`,
      linkUrl: `/teacher/appeals`,
    });
  } catch {
    // تجاهل أخطاء الإشعار.
  }

  return NextResponse.json({ ok: true });
}
