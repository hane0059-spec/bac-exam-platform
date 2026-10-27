// src/app/api/teacher/quizzes/route.ts
// GET: قائمة اختبارات المدرّس. POST: إنشاء اختبار جديد (مسوّدة).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession, teacherTeachesSubject } from "@/lib/teacher";
import { quizCreateSchema } from "@/lib/teacherQuiz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const quizzes = await prisma.quiz.findMany({
    where: { creatorId: session.sub },
    orderBy: { updatedAt: "desc" },
    include: {
      subject: { select: { name: true } },
      _count: {
        select: {
          nodes: true,
          sessions: true,
          assignments: true,
        },
      },
    },
  });

  return NextResponse.json({
    quizzes: quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      status: q.status,
      subjectName: q.subject.name,
      sessions: q._count.sessions,
      assignments: q._count.assignments,
      updatedAt: q.updatedAt,
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
  const parsed = quizCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const { title, subjectId } = parsed.data;

  if (!(await teacherTeachesSubject(session.sub, subjectId))) {
    return NextResponse.json(
      { error: "لا تملك صلاحية على هذه المادة" },
      { status: 403 }
    );
  }

  const created = await prisma.quiz.create({
    data: {
      creatorId: session.sub,
      subjectId,
      title,
      mode: "LINEAR",
      status: "DRAFT",
      settings: {
        timeLimitSec: 600,
        maxAttempts: 1,
        revealAnswers: "immediate",
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
