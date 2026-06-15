// src/app/api/teacher/students/[id]/enrollments/route.ts
// POST: تسجيل الطالب في مادة يدرّسها المدرّس. DELETE: إلغاء التسجيل.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession, teacherTeachesSubject } from "@/lib/teacher";
import { ownedStudent, academicYearFor } from "@/lib/teacherStudents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ subjectId: z.string().min(1) });

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  if (!(await ownedStudent(session.sub, params.id))) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const { subjectId } = parsed.data;

  if (!(await teacherTeachesSubject(session.sub, subjectId))) {
    return NextResponse.json(
      { error: "لا تملك صلاحية على هذه المادة" },
      { status: 403 }
    );
  }

  const existing = await prisma.studentEnrollment.findFirst({
    where: { studentId: params.id, teacherId: session.sub, subjectId },
  });
  if (existing) {
    if (!existing.isActive) {
      await prisma.studentEnrollment.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    }
    return NextResponse.json({ ok: true });
  }

  const academicYear = await academicYearFor(session.sub, subjectId);
  await prisma.studentEnrollment.create({
    data: {
      studentId: params.id,
      teacherId: session.sub,
      subjectId,
      academicYear,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  if (!(await ownedStudent(session.sub, params.id))) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }
  const subjectId = new URL(req.url).searchParams.get("subjectId");
  if (!subjectId) {
    return NextResponse.json({ error: "مادة غير محدّدة" }, { status: 400 });
  }

  await prisma.studentEnrollment.deleteMany({
    where: { studentId: params.id, teacherId: session.sub, subjectId },
  });
  return NextResponse.json({ ok: true });
}
