// src/app/api/admin/users/route.ts
// POST: إنشاء حساب مدرّس أو مدير. (المدير حصراً.)
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin";
import {
  userCreateSchema,
  nextEmployeeCode,
  currentAcademicYear,
} from "@/lib/adminUsers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = userCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const email = d.email ? d.email.toLowerCase() : null;

  if (
    email &&
    (await prisma.user.findUnique({ where: { email }, select: { id: true } }))
  ) {
    return NextResponse.json(
      { error: "البريد الإلكتروني مستخدَم سابقاً" },
      { status: 409 }
    );
  }

  // تحقّق المواد (للمدرّس فقط).
  const subjectIds = d.role === "TEACHER" ? d.subjectIds : [];
  if (subjectIds.length > 0) {
    const count = await prisma.subject.count({
      where: { id: { in: subjectIds } },
    });
    if (count !== new Set(subjectIds).size) {
      return NextResponse.json({ error: "مادة غير صالحة" }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(d.password, 10);
  const academicYear = currentAcademicYear();

  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: d.role,
      gender: d.gender,
      firstName: d.firstName,
      lastName: d.lastName,
      createdById: session.sub,
      ...(d.role === "TEACHER"
        ? {
            teacherProfile: {
              create: {
                employeeCode: await nextEmployeeCode(),
                qualification: d.qualification || null,
              },
            },
            teacherSubjects: {
              create: subjectIds.map((subjectId) => ({
                subjectId,
                academicYear,
              })),
            },
          }
        : {}),
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
