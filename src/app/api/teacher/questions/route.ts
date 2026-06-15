// src/app/api/teacher/questions/route.ts
// GET: قائمة أسئلة المدرّس (مع فلترة بالمادة). POST: إنشاء سؤال.
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

export async function GET(req: Request) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const url = new URL(req.url);
  const subjectId = url.searchParams.get("subjectId") || undefined;
  const type = url.searchParams.get("type") || undefined;

  const questions = await prisma.question.findMany({
    where: {
      creatorId: session.sub,
      isActive: true,
      ...(subjectId ? { subjectId } : {}),
      ...(type ? { type: type as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      subject: { select: { name: true } },
      chapter: { select: { title: true } },
      _count: { select: { options: true, studentAnswers: true } },
    },
  });

  return NextResponse.json({
    questions: questions.map((q) => ({
      id: q.id,
      type: q.type,
      content: q.content,
      difficulty: q.difficulty,
      points: Number(q.points),
      tags: q.tags,
      subjectName: q.subject.name,
      chapterTitle: q.chapter?.title ?? null,
      optionCount: q._count.options,
      used: q._count.studentAnswers > 0,
      createdAt: q.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
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

  // الملكية: المادة ضمن موادّ المدرّس.
  if (!(await teacherTeachesSubject(session.sub, data.subjectId))) {
    return NextResponse.json(
      { error: "لا تملك صلاحية على هذه المادة" },
      { status: 403 }
    );
  }
  // صحّة الفصل/المفهوم ضمن المادة.
  if (data.chapterId) {
    const ch = await prisma.chapter.findUnique({
      where: { id: data.chapterId },
      select: { subjectId: true },
    });
    if (!ch || ch.subjectId !== data.subjectId) {
      return NextResponse.json({ error: "فصل غير صالح" }, { status: 400 });
    }
  }
  if (data.conceptId) {
    const co = await prisma.concept.findUnique({
      where: { id: data.conceptId },
      select: { chapterId: true },
    });
    if (!co || (data.chapterId && co.chapterId !== data.chapterId)) {
      return NextResponse.json({ error: "مفهوم غير صالح" }, { status: 400 });
    }
  }

  const isShort = data.type === "SHORT_ANSWER";
  const created = await prisma.question.create({
    data: {
      creatorId: session.sub,
      subjectId: data.subjectId,
      chapterId: data.chapterId ?? null,
      conceptId: data.conceptId ?? null,
      type: data.type,
      content: data.content,
      difficulty: data.difficulty,
      points: data.points,
      explanation: data.explanation || null,
      tags: data.tags,
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
    select: { id: true },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
