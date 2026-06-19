// src/app/api/admin/students/[id]/route.ts
// PATCH: تعديل بيانات طالب من المدير (بعزل المؤسّسة). المدير يدير كل طلاب مؤسّسته.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { studentUpdateSchema } from "@/lib/teacherStudents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const student = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, schoolId: true },
  });
  if (!student || student.role !== "STUDENT")
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  // عزل المؤسّسة: مدير المدرسة يدير طلاب مؤسّسته فقط.
  if (ctx.isSchoolManager && student.schoolId !== ctx.schoolId)
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = studentUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const email = d.email ? d.email.toLowerCase() : null;

  const grade = await prisma.gradeLevel.findUnique({
    where: { id: d.gradeLevelId },
    select: { id: true },
  });
  if (!grade)
    return NextResponse.json({ error: "صفّ غير صالح" }, { status: 400 });

  if (email) {
    const other = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (other && other.id !== params.id)
      return NextResponse.json(
        { error: "البريد الإلكتروني مستخدَم سابقاً" },
        { status: 409 },
      );
  }

  await prisma.user.update({
    where: { id: params.id },
    data: {
      email,
      firstName: d.firstName,
      lastName: d.lastName,
      gender: d.gender,
      isActive: d.isActive,
      phone: d.studentPhone || null,
      studentProfile: {
        update: {
          gradeLevelId: d.gradeLevelId,
          fatherName: d.fatherName,
          motherName: d.motherName || null,
          address: d.address || null,
          parentPhone: d.parentPhone || null,
        },
      },
    },
  });

  return NextResponse.json({ id: params.id });
}
