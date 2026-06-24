// src/app/api/admin/users/[id]/set-active/route.ts
// تعطيل/تفعيل مدرّس مع خيار التسلسل إلى طلابه (الذين أنشأهم) دفعةً — قابل للتراجع.
// يكمّل أداة تفريغ المرفقات (التي تشترط التعطيل أوّلاً). المدير حصراً، بعزل المؤسّسة.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  active: z.boolean(),
  cascadeStudents: z.boolean().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
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
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const { active, cascadeStudents } = parsed.data;

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, schoolId: true, isSuperAdmin: true },
  });
  if (!target) {
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  }
  if (ctx.isSchoolManager && target.schoolId !== ctx.schoolId) {
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  }
  if (target.id === ctx.session.sub) {
    return NextResponse.json(
      { error: "لا يمكنك تغيير حالة حسابك." },
      { status: 400 }
    );
  }
  if (target.isSuperAdmin) {
    return NextResponse.json(
      { error: "لا يمكن تعطيل المدير العام للمنصّة." },
      { status: 400 }
    );
  }

  // التسلسل لطلاب المدرّس الذين أنشأهم هو (لا المسجَّلين معه فقط).
  const doCascade = cascadeStudents && target.role === "TEACHER";

  const affectedStudents = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: { isActive: active },
    });
    if (!doCascade) return 0;
    const res = await tx.user.updateMany({
      where: { createdById: target.id, role: "STUDENT" },
      data: { isActive: active },
    });
    return res.count;
  });

  return NextResponse.json({ active, affectedStudents });
}
