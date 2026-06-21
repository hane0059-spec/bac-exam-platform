// src/app/api/admin/users/[id]/route.ts
// PATCH: تعديل حساب مدرّس/مدير (بيانات/تفعيل/مواد). (المدير حصراً.)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { userUpdateSchema, currentAcademicYear } from "@/lib/adminUsers";
import { deleteStudentCompletely } from "@/lib/teacherStudents";

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

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    include: { teacherProfile: { select: { isIndependent: true } } },
  });
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
        // ملاحظات المُنشئ: لا تُعدَّل إلا من مُنشئ الحساب نفسه.
        ...(target.createdById === session.sub
          ? { creatorNotes: d.creatorNotes || null }
          : {}),
        ...(isTeacher
          ? {
              teacherProfile: {
                update: {
                  qualification: d.qualification || null,
                  canFileExams: d.canFileExams,
                  canManageStudents: d.canManageStudents,
                  // تعديل حدّ طلاب المدرّس المستقلّ (للمدير العام فقط).
                  ...(actorIsSuper && target.teacherProfile?.isIndependent
                    ? { studentLimit: d.studentLimit ?? null }
                    : {}),
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

// DELETE: حذف نهائي لحساب مستخدم. (المدير حصراً، بعزل المؤسّسة.)
// سياسة آمنة: يُسمح بحذف الحسابات الفارغة؛ ويُمنع حذف من «يملك» محتوى
// (طلاب/أسئلة/اختبارات) مع رسالة واضحة (التعطيل بديلٌ متاح). الطالب يُحذف
// بالكامل بدالته المختبَرة. لا يُحذف المدير العام ولا حساب المستخدم نفسه.
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    include: { teacherProfile: { select: { isIndependent: true } } },
  });
  if (!target) {
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  }
  // عزل المؤسّسة: مدير المدرسة يدير مستخدمي مؤسّسته فقط.
  if (ctx.isSchoolManager && target.schoolId !== ctx.schoolId) {
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  }
  // لا حذف للنفس ولا للمدير العام للمنصّة (حماية مالك المنصّة).
  if (target.id === ctx.session.sub) {
    return NextResponse.json(
      { error: "لا يمكنك حذف حسابك." },
      { status: 400 }
    );
  }
  if (target.isSuperAdmin) {
    return NextResponse.json(
      { error: "لا يمكن حذف المدير العام للمنصّة." },
      { status: 400 }
    );
  }

  // الطالب: حذف كامل بدالته المختبَرة.
  if (target.role === "STUDENT") {
    await deleteStudentCompletely(target.id);
    return NextResponse.json({ ok: true });
  }

  // وليّ الأمر: روابطه وإشعاراته تُحذف cascade.
  if (target.role === "PARENT") {
    await prisma.user.delete({ where: { id: target.id } });
    return NextResponse.json({ ok: true });
  }

  // مدرّس/مدير: يُمنع الحذف إن كان «يملك» محتوى (حمايةً للبيانات).
  const [createdUsers, questions, quizzes] = await Promise.all([
    prisma.user.count({ where: { createdById: target.id } }),
    prisma.question.count({ where: { creatorId: target.id } }),
    prisma.quiz.count({ where: { creatorId: target.id } }),
  ]);
  if (createdUsers > 0 || questions > 0 || quizzes > 0) {
    const parts: string[] = [];
    if (createdUsers > 0) parts.push(`${createdUsers} مستخدماً`);
    if (questions > 0) parts.push(`${questions} سؤالاً`);
    if (quizzes > 0) parts.push(`${quizzes} اختباراً`);
    return NextResponse.json(
      {
        error: `لا يمكن حذف هذا الحساب لأنّه أنشأ: ${parts.join(
          "، "
        )}. عطّله بدل حذفه، أو احذف محتواه أوّلاً.`,
      },
      { status: 409 }
    );
  }

  // حساب فارغ: تنظيف العلاقات (بلا cascade من جهة المستخدم) ثم الحذف.
  await prisma.$transaction([
    prisma.teacherSubject.deleteMany({ where: { teacherId: target.id } }),
    prisma.studentEnrollment.deleteMany({ where: { teacherId: target.id } }),
    prisma.quizAssignment.deleteMany({ where: { teacherId: target.id } }),
    prisma.annotation.deleteMany({ where: { authorId: target.id } }),
    prisma.attachment.deleteMany({ where: { uploadedById: target.id } }),
    prisma.teacherProfile.deleteMany({ where: { userId: target.id } }),
    prisma.user.delete({ where: { id: target.id } }),
  ]);

  // مدرّس مستقلّ: احذف مؤسّسته الخاصّة إن لم يبقَ بها مستخدمون.
  if (target.teacherProfile?.isIndependent && target.schoolId) {
    const remaining = await prisma.user.count({
      where: { schoolId: target.schoolId },
    });
    if (remaining === 0) {
      await prisma.school
        .delete({ where: { id: target.schoolId } })
        .catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
