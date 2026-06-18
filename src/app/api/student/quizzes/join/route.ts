// src/app/api/student/quizzes/join/route.ts
// POST: انضمام الطالب لاختبار عبر رمزه التسلسلي (يُنشئ إسناداً له).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStudentSession, isWithinWindow } from "@/lib/exam";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ code: z.string().trim().min(1, "أدخل رمز الاختبار") });

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
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "رمز غير صالح" },
      { status: 400 }
    );
  }

  const quiz = await prisma.quiz.findUnique({
    where: { accessCode: parsed.data.code },
  });
  if (!quiz || quiz.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "رمز غير صحيح أو الاختبار غير متاح" },
      { status: 404 }
    );
  }
  // الانضمام بالرمز يجب أن يكون مفعّلاً لهذا الاختبار.
  if (!quiz.allowCodeJoin) {
    return NextResponse.json(
      { error: "الانضمام بالرمز غير مُتاح لهذا الاختبار" },
      { status: 403 }
    );
  }
  if (!isWithinWindow(quiz.availableFrom, quiz.availableUntil)) {
    return NextResponse.json(
      { error: "هذا الاختبار خارج نافذة الإتاحة حالياً" },
      { status: 403 }
    );
  }

  const existing = await prisma.quizAssignment.findFirst({
    where: { quizId: quiz.id, studentId: session.sub },
    select: { id: true },
  });
  if (!existing) {
    await prisma.quizAssignment.create({
      data: {
        quizId: quiz.id,
        studentId: session.sub,
        teacherId: quiz.creatorId,
      },
    });
    // إشعار المدرّس بانضمام طالب جديد بالرمز.
    await createNotification({
      userId: quiz.creatorId,
      type: "JOINED",
      message: `انضمّ ${session.firstName} ${session.lastName} إلى اختبارك «${quiz.title}» بالرمز`,
      linkUrl: quiz.isFileBased
        ? `/teacher/file-exams/${quiz.id}/submissions`
        : `/teacher/quizzes/${quiz.id}/results`,
    });
  }

  return NextResponse.json({ quizId: quiz.id, title: quiz.title });
}
