// src/app/api/admin/users/[id]/reset-card/route.ts
// POST: كلمة سرّ عشوائية جديدة لمدرّس وإعادة بيانات بطاقة دخوله للطباعة. (المدير حصراً، بعزل المؤسّسة.)
// الكلمة مؤقّتة: يُطلب من المدرّس تغييرها عند أول دخول (User.mustChangePassword).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { hashPasswordFor } from "@/lib/passwords";
import { generateStudentPassword } from "@/lib/studentCredentials";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      role: true,
      schoolId: true,
      firstName: true,
      lastName: true,
      teacherProfile: { select: { employeeCode: true } },
    },
  });
  // المدرّسون فقط؛ مدير المدرسة لا يرى خارج مؤسّسته (نفس رسالة «غير موجود»).
  if (!target || target.role !== "TEACHER" || !target.teacherProfile) {
    return NextResponse.json({ error: "المدرّس غير موجود" }, { status: 404 });
  }
  if (ctx.isSchoolManager && target.schoolId !== ctx.schoolId) {
    return NextResponse.json({ error: "المدرّس غير موجود" }, { status: 404 });
  }

  // 10 محارف: كلمة المدرّس حسّاسة لحالة الأحرف وأهمّ من كلمة الطالب (تدير مؤسّسة).
  const password = generateStudentPassword(10);
  const passwordHash = await hashPasswordFor("TEACHER", password);
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash, mustChangePassword: true },
  });
  try {
    await createNotification({
      userId: target.id,
      type: "password_reset",
      message: "أُعيدت كلمة سرّك من قِبَل الإدارة. تواصل معها إن لم تطلب ذلك.",
      linkUrl: "/account",
    });
  } catch { /* تجاهل أخطاء الإشعار */ }

  return NextResponse.json({
    card: {
      name: `${target.firstName} ${target.lastName}`,
      code: target.teacherProfile.employeeCode,
      password,
    },
  });
}
