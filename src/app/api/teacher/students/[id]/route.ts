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
  return NextResponse.json({
    student: {
      id: student.id,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.gender,
      isActive: student.isActive,
      studentCode: student.studentProfile?.studentCode ?? "",
      gradeLevelId: student.studentProfile?.gradeLevelId ?? "",
      parentPhone: student.studentProfile?.parentPhone ?? "",
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

  const grade = await prisma.gradeLevel.findUnique({
    where: { id: d.gradeLevelId },
    select: { id: true },
  });
  if (!grade) {
    return NextResponse.json({ error: "صفّ غير صالح" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: params.id },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      gender: d.gender,
      isActive: d.isActive,
      studentProfile: {
        update: {
          gradeLevelId: d.gradeLevelId,
          parentPhone: d.parentPhone || null,
        },
      },
    },
  });

  return NextResponse.json({ id: params.id });
}
