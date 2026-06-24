// src/app/api/admin/users/[id]/offboard/route.ts
// المدير ينفّذ مغادرة المدرّس (بعد التصدير): تفريغ مرفقاته + تعطيل حسابه + تعطيل
// قيد طلابه في مادته (والحصريّون يُعطَّلون كلّياً). يبقى النصّ (أسئلة/درجات).
// المدير حصراً، بعزل المؤسّسة، للمدرّسين، لا النفس ولا المدير العام.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { offboardTeacher } from "@/lib/teacherOffboard";

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
    select: { id: true, role: true, schoolId: true, isSuperAdmin: true },
  });
  if (!target || target.role !== "TEACHER") {
    return NextResponse.json({ error: "المدرّس غير موجود" }, { status: 404 });
  }
  if (ctx.isSchoolManager && target.schoolId !== ctx.schoolId) {
    return NextResponse.json({ error: "المدرّس غير موجود" }, { status: 404 });
  }
  if (target.id === ctx.session.sub) {
    return NextResponse.json({ error: "لا يمكنك مغادرة حسابك." }, { status: 400 });
  }
  if (target.isSuperAdmin) {
    return NextResponse.json(
      { error: "لا يمكن مغادرة المدير العام." },
      { status: 400 }
    );
  }

  const result = await offboardTeacher(target.id);
  return NextResponse.json(result);
}
