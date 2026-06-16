// src/app/api/teacher/students/[id]/route.ts
// GET: بيانات طالب للتحرير. PATCH: تعديل بياناته. (المدرّس المُنشئ فقط.)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { ownedStudent, studentUpdateSchema } from "@/lib/teacherStudents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  if (!(await ownedStudent(session.sub, params.id))) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }
  const student = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      studentProfile: true,
      studentEnrollments: {
        where: { teacherId: session.sub, isActive: true },
        select: { subjectId: true },
      },
    },
  });
  if (!student) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }
  const p = student.studentProfile;
  return NextResponse.json({
    student: {
      id: student.id,
      email: student.email ?? "",
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      isActive: student.isActive,
      studentPhone: student.phone ?? "",
      studentCode: p?.studentCode ?? "",
      gradeLevelId: p?.gradeLevelId ?? "",
      fatherName: p?.fatherName ?? "",
      motherName: p?.motherName ?? "",
      address: p?.address ?? "",
      parentPhone: p?.parentPhone ?? "",
      enrolledSubjectIds: student.studentEnrollments.map((e) => e.subjectId),
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
  if (!(await ownedStudent(session.sub, params.id))) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }

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
      { status: 400 }
    );
  }
  const d = parsed.data;
  const email = d.email ? d.email.toLowerCase() : null;

  const grade = await prisma.gradeLevel.findUnique({
    where: { id: d.gradeLevelId },
    select: { id: true },
  });
  if (!grade) {
    return NextResponse.json({ error: "صفّ غير صالح" }, { status: 400 });
  }
  // تفرّد البريد (مع استثناء الطالب نفسه).
  if (email) {
    const other = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (other && other.id !== params.id) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مستخدَم سابقاً" },
        { status: 409 }
      );
    }
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
