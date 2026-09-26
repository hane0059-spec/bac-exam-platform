// src/app/api/student/messages/route.ts
// POST: رسالة الطالب إلى مدرّس اختباره بعد اعتماد نتيجته (سؤال/طلب إعادة/شكر).
// الحراسة: الجلسة للطالب نفسه، منتهية، بلا تصحيح معلَّق، والمدرّس مالك الاختبار.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/exam";
import { createNotification } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KIND_TEXT = {
  QUESTION: "سؤال",
  RETAKE_REQUEST: "طلب إعادة اختبار",
  THANKS: "شكر",
} as const;

const bodySchema = z.object({
  sessionId: z.string().min(1),
  kind: z.enum(["QUESTION", "RETAKE_REQUEST", "THANKS"]),
  body: z
    .string()
    .trim()
    .min(3, "اكتب رسالتك (3 أحرف على الأقل)")
    .max(1000, "الرسالة أطول من 1000 حرف"),
});

export async function POST(req: Request) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

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
      { status: 400 },
    );
  }
  const { sessionId, kind, body } = parsed.data;

  if (!checkRateLimit(`student-msg:${session.sub}`, 5, 24 * 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "بلغت الحدّ اليومي للرسائل (5). حاول غداً." },
      { status: 429 },
    );
  }

  const exam = await prisma.examSession.findUnique({
    where: { id: sessionId },
    select: {
      studentId: true,
      status: true,
      needsGrading: true,
      answers: { where: { needsReview: true }, select: { id: true }, take: 1 },
      quiz: { select: { title: true, creatorId: true } },
    },
  });
  // ملكية: جلسة الطالب نفسه فقط.
  if (!exam || exam.studentId !== session.sub) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }
  if (exam.status === "IN_PROGRESS") {
    return NextResponse.json({ error: "المحاولة لم تنتهِ بعد" }, { status: 409 });
  }
  // النتيجة النهائية فقط: لا مراسلة أثناء انتظار التصحيح.
  if (exam.needsGrading || exam.answers.length > 0) {
    return NextResponse.json(
      { error: "المراسلة متاحة بعد اعتماد نتيجتك النهائية" },
      { status: 409 },
    );
  }

  const msg = await prisma.studentMessage.create({
    data: { studentId: session.sub, sessionId, kind, body },
    select: { id: true },
  });

  try {
    await createNotification({
      userId: exam.quiz.creatorId,
      type: "student_message",
      message: `رسالة (${KIND_TEXT[kind]}) من ${session.firstName} ${session.lastName} بخصوص «${exam.quiz.title}».`,
      linkUrl: "/teacher/parent-messages",
    });
  } catch {
    // فشل الإشعار لا يكسر الإرسال.
  }

  return NextResponse.json({ ok: true, id: msg.id });
}
