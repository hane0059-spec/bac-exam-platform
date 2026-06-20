// src/app/api/admin/users/route.ts
// POST: إنشاء حساب مدرّس أو مدير. (المدير حصراً.)
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import {
  userCreateSchema,
  nextEmployeeCode,
  currentAcademicYear,
} from "@/lib/adminUsers";
import { getFieldDefs, validateAndClean } from "@/lib/customFields";
import { SOLO_MODE } from "@/lib/platformMode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const session = ctx.session;

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

  // إنشاء حساب مدير (مدير مدرسة) متاح للمدير العام للمنصّة فقط.
  const actorIsSuper = ctx.isSuper;
  if (d.role === "ADMIN" && !actorIsSuper) {
    return NextResponse.json(
      { error: "إنشاء حساب مدير متاح للمدير العام فقط" },
      { status: 403 }
    );
  }
  // الوضع المبسّط: لا يُنشأ إلا مدرّسون مستقلّون (لا مديرو مدارس).
  if (SOLO_MODE && d.role !== "TEACHER") {
    return NextResponse.json(
      { error: "في الوضع المبسّط تُنشأ حسابات المدرّسين المستقلّين فقط" },
      { status: 403 }
    );
  }
  // مدرّس مستقلّ: للمدير العام فقط، ويُنشأ له مؤسّسة خاصّة لاحقاً (تتجاوز الاختيار).
  // في الوضع المبسّط: كل مدرّس مستقلّ إلزاماً.
  const independent =
    d.role === "TEACHER" && actorIsSuper && (SOLO_MODE || d.isIndependent);
  // مؤسّسة الحساب الجديد: مدير المدرسة يورّث مؤسّسته؛ المدير العام يختار.
  let newSchoolId = ctx.isSuper ? d.schoolId ?? null : ctx.schoolId;
  // المدرّس المستقلّ يُنشأ له School خاصّة باسمه لعزل طلابه.
  if (independent) {
    const ownSchool = await prisma.school.create({
      data: {
        name: `مؤسّسة ${d.firstName} ${d.lastName}`,
        type: "مدرّس مستقل",
      },
    });
    newSchoolId = ownSchool.id;
  }

  // الحقول المخصّصة حسب الدور.
  const cf = validateAndClean(
    await getFieldDefs(d.role === "ADMIN" ? "ADMIN" : "TEACHER"),
    (raw as { customData?: unknown }).customData
  );
  if (!cf.ok) {
    return NextResponse.json({ error: cf.error }, { status: 400 });
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
      // المدير العام فقط على مستوى المنصّة (بلا مؤسّسة)؛ مدير المدرسة ليس «عاماً».
      isSuperAdmin:
        d.role === "ADMIN" && actorIsSuper && newSchoolId === null
          ? d.isSuperAdmin
          : false,
      schoolId: newSchoolId,
      customData: cf.data,
      createdById: session.sub,
      creatorNotes: d.creatorNotes || null,
      ...(d.role === "TEACHER"
        ? {
            teacherProfile: {
              create: {
                employeeCode: await nextEmployeeCode(),
                qualification: d.qualification || null,
                canFileExams: d.canFileExams,
                // المستقلّ يدير طلابه دائماً.
                canManageStudents: independent ? true : d.canManageStudents,
                isIndependent: independent,
                studentLimit: independent ? d.studentLimit ?? null : null,
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
