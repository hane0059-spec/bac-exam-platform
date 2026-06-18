// src/app/api/admin/students/route.ts
// POST: إنشاء حساب طالب من المدير (ضمن مؤسّسته، بلا تسجيل مادة).
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { nextStudentCode } from "@/lib/teacherStudents";
import { getFieldDefs, validateAndClean } from "@/lib/customFields";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optionalEmail = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().trim().email("بريد إلكتروني غير صالح").optional()
);

const schema = z.object({
  email: optionalEmail,
  password: z.string().min(6, "كلمة السر 6 أحرف على الأقل"),
  firstName: z.string().trim().min(1, "الاسم الأول مطلوب"),
  lastName: z.string().trim().min(1, "الاسم الأخير مطلوب"),
  fatherName: z.string().trim().min(1, "اسم الأب مطلوب"),
  motherName: z.string().trim().optional(),
  gender: z.enum(["MALE", "FEMALE"]),
  gradeLevelId: z.string().min(1, "الصفّ مطلوب"),
  address: z.string().trim().optional(),
  studentPhone: z.string().trim().optional(),
  parentPhone: z.string().trim().optional(),
  enrollmentYear: z.number().int().min(2000).max(2100).default(new Date().getFullYear()),
});

export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
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
  const email = d.email ? d.email.toLowerCase() : null;

  const grade = await prisma.gradeLevel.findUnique({
    where: { id: d.gradeLevelId },
    select: { id: true },
  });
  if (!grade) {
    return NextResponse.json({ error: "صفّ غير صالح" }, { status: 400 });
  }
  if (
    email &&
    (await prisma.user.findUnique({ where: { email }, select: { id: true } }))
  ) {
    return NextResponse.json(
      { error: "البريد الإلكتروني مستخدَم سابقاً" },
      { status: 409 }
    );
  }

  const cf = validateAndClean(
    await getFieldDefs("STUDENT"),
    (raw as { customData?: unknown }).customData
  );
  if (!cf.ok) {
    return NextResponse.json({ error: cf.error }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(d.password, 10);
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
          schoolId: ctx.schoolId,
          customData: cf.data,
          createdById: ctx.session.sub,
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
        },
        select: { id: true },
      });
      return NextResponse.json({ id: created.id }, { status: 201 });
    } catch (e) {
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
