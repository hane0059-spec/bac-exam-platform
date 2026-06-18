// src/app/api/admin/grades/[id]/route.ts
// PATCH: تعديل صفّ. DELETE: حذفه إن لم يكن مستخدَماً. (المدير حصراً.)
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1, "اسم الصفّ مطلوب"),
  code: z.string().trim().min(1, "رمز الصفّ مطلوب"),
  orderNum: z.number().int().min(0).default(0),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const grade = await prisma.gradeLevel.findUnique({ where: { id: params.id } });
  if (!grade) {
    return NextResponse.json({ error: "الصفّ غير موجود" }, { status: 404 });
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
  const other = await prisma.gradeLevel.findUnique({
    where: { code: d.code },
    select: { id: true },
  });
  if (other && other.id !== grade.id) {
    return NextResponse.json({ error: "رمز الصفّ مستخدَم سابقاً" }, { status: 409 });
  }
  await prisma.gradeLevel.update({
    where: { id: grade.id },
    data: { name: d.name, code: d.code, orderNum: d.orderNum },
  });
  return NextResponse.json({ id: grade.id });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const [subjects, students] = await Promise.all([
    prisma.subject.count({ where: { gradeLevelId: params.id } }),
    prisma.studentProfile.count({ where: { gradeLevelId: params.id } }),
  ]);
  if (subjects > 0 || students > 0) {
    return NextResponse.json(
      { error: "لا يمكن حذف صفّ مرتبط بمواد أو طلاب" },
      { status: 409 }
    );
  }
  await prisma.gradeLevel.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
