// src/app/api/admin/users/[id]/route.ts
// PATCH: تعديل حساب مدرّس/مدير (بيانات/تفعيل/مواد). (المدير حصراً.)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { userUpdateSchema, currentAcademicYear } from "@/lib/adminUsers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const session = ctx.session;

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) {
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  }
  // عزل المؤسّسة: مدير المدرسة يدير مستخدمي مؤسّسته فقط.
  if (ctx.isSchoolManager && target.schoolId !== ctx.schoolId) {
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  }
  if (target.role === "STUDENT") {
    return NextResponse.json(
      { error: "يُدار الطالب من صفحة مدرّسه" },
      { status: 400 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = userUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const email = d.email ? d.email.toLowerCase() : null;

  // إدارة حسابات المدراء للمدير العام فقط.
  const actorIsSuper = ctx.isSuper;
  if (target.role === "ADMIN" && !actorIsSuper) {
    return NextResponse.json(
      { error: "إدارة حسابات المدراء متاحة للمدير العام فقط" },
      { status: 403 }
    );
  }
  // منع المدير من إيقاف حسابه أو إزالة صلاحيته العليا.
  if (target.id === session.sub && !d.isActive) {
    return NextResponse.json({ error: "لا يمكنك إيقاف حسابك" }, { status: 400 });
  }
  if (target.id === session.sub && target.isSuperAdmin && !d.isSuperAdmin) {
    return NextResponse.json(
      { error: "لا يمكنك إزالة صلاحيتك كمدير عام" },
      { status: 400 }
    );
  }
  const newSuper =
    target.role === "ADMIN" && actorIsSuper
      ? d.isSuperAdmin
      : target.isSuperAdmin;
  if (email) {
    const other = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (other && other.id !== target.id) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مستخدَم سابقاً" },
        { status: 409 }
      );
    }
  }

  const isTeacher = target.role === "TEACHER";
  const subjectIds = isTeacher ? d.subjectIds : [];
  if (subjectIds.length > 0) {
    const count = await prisma.subject.count({
      where: { id: { in: subjectIds } },
    });
    if (count !== new Set(subjectIds).size) {
      return NextResponse.json({ error: "مادة غير صالحة" }, { status: 400 });
    }
  }

  const academicYear = currentAcademicYear();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: {
        firstName: d.firstName,
        lastName: d.lastName,
        gender: d.gender,
        email,
        isActive: d.isActive,
        isSuperAdmin: target.role === "ADMIN" ? newSuper : false,
        ...(isTeacher
          ? {
              teacherProfile: {
                update: {
                  qualification: d.qualification || null,
                  canFileExams: d.canFileExams,
                  canManageStudents: d.canManageStudents,
                },
              },
            }
          : {}),
      },
    });
    if (isTeacher) {
      await tx.teacherSubject.deleteMany({ where: { teacherId: target.id } });
      if (subjectIds.length > 0) {
        await tx.teacherSubject.createMany({
          data: subjectIds.map((subjectId) => ({
            teacherId: target.id,
            subjectId,
            academicYear,
          })),
        });
      }
    }
  });

  return NextResponse.json({ id: target.id });
}
