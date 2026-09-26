// src/app/api/parent/messages/route.ts
// POST: رسالة وليّ أمر (اعتراض/شكر/طلب إعادة) إلى مدرّس اختبار ابنه، ويُشعَر المدرّس.
// الحراسة: الوليّ مرتبط بالطالب، والجلسة للطالب ومنتهية، والمدرّس هو مالك الاختبار.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getParentSession, parentOwnsStudent } from "@/lib/parent";
import { createNotification } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KIND_TEXT = {
  OBJECTION: "اعتراض",
  THANKS: "شكر",
  RETAKE_REQUEST: "طلب إعادة اختبار",
} as const;

const bodySchema = z.object({
  sessionId: z.string().min(1),
  kind: z.enum(["OBJECTION", "THANKS", "RETAKE_REQUEST"]),
  body: z
    .string()
    .trim()
    .min(3, "اكتب رسالتك (3 أحرف على الأقل)")
    .max(1000, "الرسالة أطول من 1000 حرف"),
});

export async function POST(req: Request) {
  const session = await getParentSession();
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

  // حدّ 5 رسائل يومياً لكل وليّ.
  if (!checkRateLimit(`parent-msg:${session.sub}`, 5, 24 * 60 * 60 * 1000)) {
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
      student: { select: { firstName: true, lastName: true } },
      quiz: { select: { title: true, creatorId: true } },
    },
  });
  // ملكية: الوليّ مرتبط بصاحب الجلسة (وإلا 404 لعدم كشف الوجود).
  if (!exam || !(await parentOwnsStudent(session.sub, exam.studentId))) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }
  if (exam.status === "IN_PROGRESS") {
    return NextResponse.json({ error: "المحاولة لم تنتهِ بعد" }, { status: 409 });
  }

  const msg = await prisma.parentMessage.create({
    data: { parentId: session.sub, studentId: exam.studentId, sessionId, kind, body },
    select: { id: true },
  });

  try {
    await createNotification({
      userId: exam.quiz.creatorId,
      type: "parent_message",
      message: `رسالة (${KIND_TEXT[kind]}) من وليّ أمر ${exam.student.firstName} ${exam.student.lastName} بخصوص «${exam.quiz.title}».`,
      linkUrl: `/teacher/parent-messages?p=${msg.id}`,
    });
  } catch {
    // فشل الإشعار لا يكسر الإرسال.
  }

  return NextResponse.json({ ok: true, id: msg.id });
}
