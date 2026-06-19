// src/app/api/teacher/students/route.ts
// GET: قائمة طلاب المدرّس (من إنشائه). POST: إنشاء حساب طالب وتسجيله في مادة.
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  getTeacherSession,
  teacherTeachesSubject,
  teacherCanManageStudents,
} from "@/lib/teacher";
import {
  studentCreateSchema,
  academicYearFor,
  nextStudentCode,
} from "@/lib/teacherStudents";
import { getFieldDefs, validateAndClean } from "@/lib/customFields";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", createdById: session.sub },
    orderBy: { createdAt: "desc" },
    include: {
      studentProfile: { include: { gradeLevel: { select: { name: true } } } },
      studentEnrollments: {
        where: { teacherId: session.sub, isActive: true },
        include: { subject: { select: { id: true, name: true } } },
      },
    },
  });

  return NextResponse.json({
    students: students.map((s) => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      email: s.email,
      gender: s.gender,
      isActive: s.isActive,
      studentCode: s.studentProfile?.studentCode ?? "—",
      gradeLevel: s.studentProfile?.gradeLevel?.name ?? "—",
      subjects: s.studentEnrollments.map((e) => e.subject.name),
    })),
  });
}

export async function POST(req: Request) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  if (!(await teacherCanManageStudents(session.sub))) {
    return NextResponse.json(
      { error: "إدارة الطلاب غير مفعّلة لحسابك — اطلبها من إدارة المؤسّسة." },
      { status: 403 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = studentCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const email = d.email ? d.email.toLowerCase() : null;

  // الملكية: المادة ضمن مواد المدرّس.
  if (!(await teacherTeachesSubject(session.sub, d.subjectId))) {
    return NextResponse.json(
      { error: "لا تملك صلاحية على هذه المادة" },
      { status: 403 }
    );
  }
  const grade = await prisma.gradeLevel.findUnique({
    where: { id: d.gradeLevelId },
    select: { id: true },
  });
  if (!grade) {
    return NextResponse.json({ error: "صفّ غير صالح" }, { status: 400 });
  }
  // تفرّد البريد عند وجوده فقط.
  if (
    email &&
    (await prisma.user.findUnique({ where: { email }, select: { id: true } }))
  ) {
    return NextResponse.json(
      { error: "البريد الإلكتروني مستخدَم سابقاً" },
      { status: 409 }
    );
  }

  const academicYear = await academicYearFor(session.sub, d.subjectId);
  const passwordHash = await bcrypt.hash(d.password, 10);
  // الحقول المخصّصة.
  const cf = validateAndClean(
    await getFieldDefs("STUDENT"),
    (raw as { customData?: unknown }).customData
  );
  if (!cf.ok) {
    return NextResponse.json({ error: cf.error }, { status: 400 });
  }
  // الطالب يرث مؤسّسة المدرّس.
  const teacher = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { schoolId: true },
  });

  // محاولة الإنشاء مع توليد رمز تسلسلي، وإعادة المحاولة عند تزامن نادر.
  for (let attempt = 0; attempt < 5; attempt++) {
    const studentCode = await nextStudentCode();
    try {
      const created = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: "STUDENT",
          gender: d.gender,
          firstName: d.firstName,
          lastName: d.lastName,
          phone: d.studentPhone || null,
          schoolId: teacher?.schoolId ?? null,
          customData: cf.data,
          createdById: session.sub,
          studentProfile: {
            create: {
              studentCode,
              gradeLevelId: d.gradeLevelId,
              fatherName: d.fatherName,
              motherName: d.motherName || null,
              address: d.address || null,
              parentPhone: d.parentPhone || null,
              enrollmentYear: d.enrollmentYear,
            },
          },
          studentEnrollments: {
            create: [
              { teacherId: session.sub, subjectId: d.subjectId, academicYear },
            ],
          },
        },
        select: { id: true },
      });
      return NextResponse.json({ id: created.id }, { status: 201 });
    } catch (e) {
      // تصادم رمز الطالب الفريد → أعد التوليد. غير ذلك → اخرج.
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002" &&
        Array.isArray(e.meta?.target) &&
        (e.meta?.target as string[]).some((t) => t.includes("student_code"))
      ) {
        continue;
      }
      throw e;
    }
  }
  return NextResponse.json(
    { error: "تعذّر توليد رمز فريد، حاول مجدداً" },
    { status: 500 }
  );
}
