// src/app/api/teacher/quizzes/[id]/route.ts
// PATCH: حفظ بيانات الاختبار وأسئلته. DELETE: حذف (أو أرشفة إن كان مُستخدَماً).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import {
  ownedQuiz,
  canEditStructure,
  quizSaveSchema,
  rebuildQuizGraph,
} from "@/lib/teacherQuiz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const quiz = await ownedQuiz(session.sub, params.id);
  if (!quiz) {
    return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = quizSaveSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const structural = await canEditStructure(quiz.id, quiz.status);

  // بيانات تُعدَّل دائماً: العنوان/الوصف ونافذة التوقيت.
  const metaData = {
    title: data.title,
    description: data.description || null,
    availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
    availableUntil: data.availableUntil ? new Date(data.availableUntil) : null,
  };

  if (!structural) {
    // اختبار منشور أو له جلسات: لا تُمسّ الأسئلة ولا الإعدادات المؤثّرة.
    await prisma.quiz.update({ where: { id: quiz.id }, data: metaData });
    return NextResponse.json({ id: quiz.id, structural: false });
  }

  // تحقّق ملكية الأسئلة وانتماؤها لمادة الاختبار.
  const ids = data.questions.map((q) => q.questionId);
  if (ids.length > 0) {
    const valid = await prisma.question.count({
      where: {
        id: { in: ids },
        creatorId: session.sub,
        subjectId: quiz.subjectId,
        isActive: true,
      },
    });
    if (valid !== new Set(ids).size) {
      return NextResponse.json(
        { error: "بعض الأسئلة غير صالحة لهذه المادة" },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.quiz.update({
      where: { id: quiz.id },
      data: {
        ...metaData,
        settings: {
          timeLimitSec: data.settings.timeLimitSec,
          maxAttempts: data.settings.maxAttempts,
          revealAnswers: data.settings.revealAnswers,
        },
      },
    });
    await rebuildQuizGraph(tx, quiz.id, data.questions);
  });

  return NextResponse.json({ id: quiz.id, structural: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const quiz = await ownedQuiz(session.sub, params.id);
  if (!quiz) {
    return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  }

  const [sessions, assignments] = await Promise.all([
    prisma.examSession.count({ where: { quizId: quiz.id } }),
    prisma.quizAssignment.count({ where: { quizId: quiz.id } }),
  ]);

  // مُستخدَم (جلسات/إسناد) → أرشفة بدل الحذف حفاظاً على البيانات.
  if (sessions > 0 || assignments > 0) {
    await prisma.quiz.update({
      where: { id: quiz.id },
      data: { status: "ARCHIVED" },
    });
    return NextResponse.json({ archived: true });
  }

  await prisma.quiz.delete({ where: { id: quiz.id } });
  return NextResponse.json({ deleted: true });
}
