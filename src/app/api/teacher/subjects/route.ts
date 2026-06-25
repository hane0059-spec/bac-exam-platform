// src/app/api/teacher/subjects/route.ts
// GET: كل الصفوف + مواد المنصّة مع تمييز ما يدرّسه المدرّس الحالي.
// PUT: تحديث موادّ المدرّس للعام الدراسي الحالي (استبدال كامل).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { currentAcademicYear } from "@/lib/adminUsers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getTeacherSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const year = currentAcademicYear();

  const [gradeLevels, mySubjects] = await Promise.all([
    prisma.gradeLevel.findMany({
      orderBy: { orderNum: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        subjects: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, code: true, color: true },
        },
      },
    }),
    prisma.teacherSubject.findMany({
      where: { teacherId: session.sub, academicYear: year },
      select: { subjectId: true },
    }),
  ]);

  const mySet = new Set(mySubjects.map((s) => s.subjectId));

  return NextResponse.json({
    year,
    gradeLevels: gradeLevels.map((gl) => ({
      ...gl,
      subjects: gl.subjects.map((s) => ({ ...s, selected: mySet.has(s.id) })),
    })),
  });
}

const putSchema = z.object({
  subjectIds: z.array(z.string().min(1)).max(30, "حدّ أقصى 30 مادة"),
});

export async function PUT(req: Request) {
  const session = await getTeacherSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = putSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );

  const { subjectIds } = parsed.data;
  const year = currentAcademicYear();

  // تحقّق أن المعرّفات كلّها لمواد حقيقية ونشطة.
  if (subjectIds.length > 0) {
    const found = await prisma.subject.count({
      where: { id: { in: subjectIds }, isActive: true },
    });
    if (found !== subjectIds.length)
      return NextResponse.json({ error: "بعض المواد غير صالحة" }, { status: 400 });
  }

  // حذف سجلات العام الحالي وإعادة الإنشاء داخل transaction.
  await prisma.$transaction([
    prisma.teacherSubject.deleteMany({
      where: { teacherId: session.sub, academicYear: year },
    }),
    ...(subjectIds.length > 0
      ? [
          prisma.teacherSubject.createMany({
            data: subjectIds.map((subjectId) => ({
              teacherId: session.sub,
              subjectId,
              academicYear: year,
            })),
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ ok: true, count: subjectIds.length, year });
}
