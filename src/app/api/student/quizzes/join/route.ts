// src/app/api/student/quizzes/join/route.ts
// POST: انضمام الطالب لاختبار عبر رمزه التسلسلي (يُنشئ إسناداً له).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStudentSession, isWithinWindow } from "@/lib/exam";

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
  }

  return NextResponse.json({ quizId: quiz.id, title: quiz.title });
}
