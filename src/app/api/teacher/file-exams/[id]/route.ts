// src/app/api/teacher/file-exams/[id]/route.ts
// PATCH: تعديل بيانات الاختبار الورقي (عنوان/وصف/درجة/توقيت). المدرّس المالك.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { ownedQuiz } from "@/lib/teacherQuiz";
import { fileExamUpdateSchema, parseFileExamSettings } from "@/lib/fileExam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getTeacherSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const quiz = await ownedQuiz(session.sub, params.id);
  if (!quiz || !quiz.isFileBased) {
    return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = fileExamUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // تغيير الدرجة القصوى ممنوع بعد بدء التصحيح (يفسد النِّسب المحسوبة).
  const cur = parseFileExamSettings(quiz.settings);
  if (d.maxScore !== cur.maxScore) {
    const graded = await prisma.examSession.count({
      where: { quizId: quiz.id, needsGrading: false, status: "COMPLETED" },
    });
    if (graded > 0) {
      return NextResponse.json(
        { error: "لا يمكن تغيير الدرجة القصوى بعد تصحيح محاولات." },
        { status: 409 },
      );
    }
  }

  await prisma.quiz.update({
    where: { id: quiz.id },
    data: {
      title: d.title,
      description: d.description || null,
      settings: {
        maxAttempts: 1,
        maxScore: d.maxScore,
        timeLimitSec: d.timeLimitSec ?? null,
      },
      availableFrom: d.availableFrom ? new Date(d.availableFrom) : null,
      availableUntil: d.availableUntil ? new Date(d.availableUntil) : null,
    },
  });

  return NextResponse.json({ ok: true });
}
