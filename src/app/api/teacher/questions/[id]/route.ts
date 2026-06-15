// src/app/api/teacher/questions/[id]/route.ts
// GET: سؤال مفرد للتحرير. PATCH: تعديل. DELETE: حذف ناعم.
// قاعدة الأمان: المدرّس المُنشئ فقط؛ والسؤال المُستخدَم في إجابات لا تُعدَّل بنيته.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getTeacherSession,
  teacherTeachesSubject,
  questionInputSchema,
  optionLabel,
} from "@/lib/teacher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ownedQuestion(teacherId: string, id: string) {
  const q = await prisma.question.findUnique({ where: { id } });
  if (!q || q.creatorId !== teacherId || !q.isActive) return null;
  return q;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const q = await prisma.question.findUnique({
    where: { id: params.id },
    include: {
      options: { orderBy: { orderNum: "asc" } },
      _count: { select: { studentAnswers: true } },
    },
  });
  if (!q || q.creatorId !== session.sub || !q.isActive) {
    return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  }
  return NextResponse.json({
    question: {
      id: q.id,
      type: q.type,
      subjectId: q.subjectId,
      chapterId: q.chapterId,
      conceptId: q.conceptId,
      content: q.content,
      difficulty: q.difficulty,
      points: Number(q.points),
      explanation: q.explanation ?? "",
      tags: q.tags,
      acceptedAnswers: q.acceptedAnswers,
      options: q.options.map((o) => ({
        content: o.content,
        isCorrect: o.isCorrect,
      })),
      used: q._count.studentAnswers > 0,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const existing = await ownedQuestion(session.sub, params.id);
  if (!existing) {
    return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = questionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (!(await teacherTeachesSubject(session.sub, data.subjectId))) {
    return NextResponse.json(
      { error: "لا تملك صلاحية على هذه المادة" },
      { status: 403 }
    );
  }

  const used =
    (await prisma.studentAnswer.count({
      where: { questionId: existing.id },
    })) > 0;

  // السؤال المُستخدَم: يُمنع تغيير النوع أو بنية الخيارات (حفاظاً على الإجابات).
  if (used && data.type !== existing.type) {
    return NextResponse.json(
      { error: "السؤال مُستخدَم في إجابات الطلاب — لا يمكن تغيير نوعه" },
      { status: 409 }
    );
  }

  const isShort = data.type === "SHORT_ANSWER";

  const scalar = {
    subjectId: data.subjectId,
    chapterId: data.chapterId ?? null,
    conceptId: data.conceptId ?? null,
    content: data.content,
    difficulty: data.difficulty,
    points: data.points,
    explanation: data.explanation || null,
    tags: data.tags,
  };

  if (used) {
    // تحديث الحقول النصّية فقط؛ تُترك بنية الخيارات والإجابات كما هي.
    await prisma.question.update({
      where: { id: existing.id },
      data: scalar,
    });
    return NextResponse.json({ id: existing.id, optionsLocked: true });
  }

  // غير مُستخدَم: استبدال كامل للخيارات/الإجابات ضمن معاملة.
  await prisma.$transaction([
    prisma.questionOption.deleteMany({ where: { questionId: existing.id } }),
    prisma.question.update({
      where: { id: existing.id },
      data: {
        ...scalar,
        type: data.type,
        acceptedAnswers: isShort ? data.acceptedAnswers : [],
        options: isShort
          ? undefined
          : {
              create: data.options.map((o, i) => ({
                label: optionLabel(data.type, i, o.content),
                content: o.content,
                isCorrect: o.isCorrect,
                orderNum: i,
              })),
            },
      },
    }),
  ]);

  return NextResponse.json({ id: existing.id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const existing = await ownedQuestion(session.sub, params.id);
  if (!existing) {
    return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
  }
  // حذف ناعم: يبقى السجلّ حفاظاً على أي جلسات/اختبارات مرتبطة.
  await prisma.question.update({
    where: { id: existing.id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
