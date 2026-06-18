// src/app/api/admin/grades/route.ts
// POST: إنشاء صفّ دراسي. (المدير حصراً.)
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1, "اسم الصفّ مطلوب"),
  code: z.string().trim().min(1, "رمز الصفّ مطلوب"),
  orderNum: z.number().int().min(0).default(0),
});

export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx || !ctx.isSuper) {
    return NextResponse.json({ error: "متاح للمدير العام فقط" }, { status: 403 });
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

  if (
    await prisma.gradeLevel.findUnique({
      where: { code: d.code },
      select: { id: true },
    })
  ) {
    return NextResponse.json({ error: "رمز الصفّ مستخدَم سابقاً" }, { status: 409 });
  }

  const created = await prisma.gradeLevel.create({
    data: { name: d.name, code: d.code, orderNum: d.orderNum },
    select: { id: true },
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
