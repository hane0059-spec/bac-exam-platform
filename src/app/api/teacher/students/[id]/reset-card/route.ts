// src/app/api/teacher/students/[id]/reset-card/route.ts
// POST: كلمة سرّ عشوائية جديدة لطالب واحد وإعادة بيانات بطاقته للطباعة. (المدرّس المُنشئ فقط + إذن إدارة الطلاب.)
// بخلاف إعادة تعيين المجموعة لا يستثني من دخل: إجراء مقصود على طالب بعينه.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getTeacherSession, teacherCanManageStudents } from "@/lib/teacher";
import { ownedStudent } from "@/lib/teacherStudents";
import { randomPassword } from "@/lib/externalImport";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
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
  const student = await ownedStudent(session.sub, params.id);
  if (!student) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }

  const [profile, enrollments] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: student.id },
      select: { studentCode: true },
    }),
    prisma.studentEnrollment.findMany({
      where: { studentId: student.id, teacherId: session.sub, isActive: true },
      select: { groupName: true, subject: { select: { name: true } } },
    }),
  ]);

  const password = randomPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: student.id }, data: { passwordHash } });
  try {
    await createNotification({
      userId: student.id,
      type: "password_reset",
      message: "أُعيدت كلمة سرّك من قِبَل مدرّسك. تواصل معه إن لم تطلب ذلك.",
      linkUrl: "/account",
    });
  } catch { /* تجاهل أخطاء الإشعار */ }

  return NextResponse.json({
    card: {
      name: `${student.firstName} ${student.lastName}`,
      studentCode: profile?.studentCode ?? "—",
      password,
      group: enrollments.find((e) => e.groupName?.trim())?.groupName?.trim() ?? "",
    },
    subjects: enrollments.map((e) => e.subject.name),
  });
}
