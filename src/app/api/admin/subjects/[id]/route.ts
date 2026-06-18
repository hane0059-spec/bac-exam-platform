// src/app/api/admin/subjects/[id]/route.ts
// PATCH: تعديل مادة. DELETE: حذفها إن لم تكن مستخدَمة. (المدير حصراً.)
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1, "اسم المادة مطلوب"),
  code: z.string().trim().min(1, "رمز المادة مطلوب"),
  gradeLevelId: z.string().min(1, "الصفّ مطلوب"),
  color: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx || !ctx.isSuper) {
    return NextResponse.json({ error: "متاح للمدير العام فقط" }, { status: 403 });
  }
  const subject = await prisma.subject.findUnique({ where: { id: params.id } });
  if (!subject) {
    return NextResponse.json({ error: "المادة غير موجودة" }, { status: 404 });
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
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const grade = await prisma.gradeLevel.findUnique({
    where: { id: d.gradeLevelId },
    select: { id: true },
  });
  if (!grade) {
    return NextResponse.json({ error: "صفّ غير صالح" }, { status: 400 });
  }
  const other = await prisma.subject.findUnique({
    where: { code: d.code },
    select: { id: true },
  });
  if (other && other.id !== subject.id) {
    return NextResponse.json(
      { error: "رمز المادة مستخدَم سابقاً" },
      { status: 409 }
    );
  }
  await prisma.subject.update({
    where: { id: subject.id },
    data: {
      name: d.name,
      code: d.code,
      gradeLevelId: d.gradeLevelId,
      color: d.color || null,
      description: d.description || null,
    },
  });
  return NextResponse.json({ id: subject.id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx || !ctx.isSuper) {
    return NextResponse.json({ error: "متاح للمدير العام فقط" }, { status: 403 });
  }
  const [questions, quizzes, enrollments, teacherSubjects, chapters] =
    await Promise.all([
      prisma.question.count({ where: { subjectId: params.id } }),
      prisma.quiz.count({ where: { subjectId: params.id } }),
      prisma.studentEnrollment.count({ where: { subjectId: params.id } }),
      prisma.teacherSubject.count({ where: { subjectId: params.id } }),
      prisma.chapter.count({ where: { subjectId: params.id } }),
    ]);
  if (questions || quizzes || enrollments || teacherSubjects || chapters) {
    return NextResponse.json(
      { error: "لا يمكن حذف مادة مستخدَمة (أسئلة/اختبارات/تسجيلات/مدرّسون)" },
      { status: 409 }
    );
  }
  await prisma.subject.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
