// src/app/api/teacher/file-exams/route.ts
// POST: إنشاء اختبار ورقي/مرفوع (مسوّدة). المدرّس حصراً، بملكية المادة.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getTeacherSession,
  teacherTeachesSubject,
  teacherCanFileExams,
} from "@/lib/teacher";
import { fileExamCreateSchema } from "@/lib/fileExam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getTeacherSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  // الخاصّية يفعّلها المدير عند الطلب.
  if (!(await teacherCanFileExams(session.sub)))
    return NextResponse.json(
      { error: "ميزة الاختبارات الورقية غير مفعّلة لحسابك — اطلبها من الإدارة." },
      { status: 403 },
    );

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = fileExamCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  if (!(await teacherTeachesSubject(session.sub, d.subjectId))) {
    return NextResponse.json(
      { error: "لا تملك صلاحية على هذه المادة" },
      { status: 403 },
    );
  }

  const created = await prisma.quiz.create({
    data: {
      creatorId: session.sub,
      subjectId: d.subjectId,
      title: d.title,
      description: d.description || null,
      mode: "LINEAR",
      status: "DRAFT",
      isFileBased: true,
      settings: {
        maxAttempts: 1,
        maxScore: d.maxScore,
        timeLimitSec: d.timeLimitSec ?? null,
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
