// src/app/api/admin/users/[id]/password/route.ts
// POST: إعادة تعيين كلمة سرّ حساب (مدرّس/مدير). (المدير حصراً.)
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminSession, isSuperAdmin } from "@/lib/admin";
import { passwordSchema } from "@/lib/adminUsers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true },
  });
  if (!target || target.role === "STUDENT") {
    return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
  }
  if (target.role === "ADMIN" && !(await isSuperAdmin(session.sub))) {
    return NextResponse.json(
      { error: "إعادة كلمة سرّ مدير متاحة للمدير العام فقط" },
      { status: 403 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "كلمة سر غير صالحة" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: target.id },
    data: { passwordHash },
  });
  return NextResponse.json({ ok: true });
}
