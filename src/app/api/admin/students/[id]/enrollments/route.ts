// src/app/api/admin/students/[id]/enrollments/route.ts
// POST: تسجيل الطالب مع مدرّس في مادة. DELETE: إلغاء تسجيل. المدير بعزل المؤسّسة.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { teacherTeachesSubject } from "@/lib/teacher";
import { academicYearFor } from "@/lib/teacherStudents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// يتحقّق أن الطالب ضمن نطاق المدير ويُعيد مؤسّسته.
async function studentInScope(studentId: string) {
  const ctx = await getAdminContext();
  if (!ctx) return { error: NextResponse.json({ error: "غير مخوّل" }, { status: 401 }) };
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true, schoolId: true },
  });
  if (!student || student.role !== "STUDENT")
    return { error: NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 }) };
  if (ctx.isSchoolManager && student.schoolId !== ctx.schoolId)
    return { error: NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 }) };
  return { ctx, student };
}

const postSchema = z.object({
  teacherId: z.string().min(1),
  subjectId: z.string().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const sc = await studentInScope(params.id);
  if ("error" in sc) return sc.error;
  const { student } = sc;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  const { teacherId, subjectId } = parsed.data;

  // المدرّس ضمن مؤسّسة الطالب نفسها ويدرّس المادة.
  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { role: true, schoolId: true },
  });
  if (!teacher || teacher.role !== "TEACHER" || teacher.schoolId !== student.schoolId)
    return NextResponse.json({ error: "مدرّس غير صالح" }, { status: 400 });
  if (!(await teacherTeachesSubject(teacherId, subjectId)))
    return NextResponse.json({ error: "المدرّس لا يدرّس هذه المادة" }, { status: 400 });

  const existing = await prisma.studentEnrollment.findFirst({
    where: { studentId: student.id, teacherId, subjectId },
    select: { id: true, isActive: true },
  });
  if (existing) {
    if (!existing.isActive)
      await prisma.studentEnrollment.update({
        where: { id: existing.id },
        data: { isActive: true },
      });
    return NextResponse.json({ ok: true });
  }

  await prisma.studentEnrollment.create({
    data: {
      studentId: student.id,
      teacherId,
      subjectId,
      academicYear: await academicYearFor(teacherId, subjectId),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const sc = await studentInScope(params.id);
  if ("error" in sc) return sc.error;
  const { student } = sc;

  const enrollmentId = new URL(req.url).searchParams.get("enrollmentId");
  if (!enrollmentId)
    return NextResponse.json({ error: "تسجيل غير محدّد" }, { status: 400 });

  await prisma.studentEnrollment.deleteMany({
    where: { id: enrollmentId, studentId: student.id },
  });
  return NextResponse.json({ ok: true });
}
