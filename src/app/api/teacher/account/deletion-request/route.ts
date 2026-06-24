// src/app/api/teacher/account/deletion-request/route.ts
// المدرّس يطلب حذف حسابه من المدير. يُشعَر مدراء مؤسّسته + المدير العام،
// فيصدّر المدير حزمته ثمّ يفرّغ مرفقاته/يحذفه. بلا تغيير مخطط (يستعمل الإشعارات).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { createNotifications } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPE = "teacher_deletion_request";

export async function POST() {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { firstName: true, lastName: true, schoolId: true },
  });
  if (!me) {
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  }

  const linkUrl = `/admin/users/${session.sub}/edit`;

  // منع التكرار: طلبٌ غير مقروء قائمٌ بالفعل لهذا المدرّس.
  const existing = await prisma.notification.findFirst({
    where: { type: TYPE, linkUrl, isRead: false },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ alreadyRequested: true });
  }

  // مدراء يديرون هذا المدرّس: المدير العام + مدير مؤسّسته.
  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      isActive: true,
      OR: [
        { isSuperAdmin: true },
        ...(me.schoolId ? [{ schoolId: me.schoolId }] : []),
      ],
    },
    select: { id: true },
  });

  await createNotifications(
    admins.map((a) => ({
      userId: a.id,
      type: TYPE,
      message: `طلب المدرّس ${me.firstName} ${me.lastName} حذف حسابه. صدّر بياناته ثمّ فرّغ مرفقاته أو احذفه.`,
      linkUrl,
    }))
  );

  return NextResponse.json({ notified: admins.length });
}
