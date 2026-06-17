// src/app/api/admin/subjects/route.ts
// POST: إنشاء مادة وربطها بصفّ. (المدير حصراً.)
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1, "اسم المادة مطلوب"),
  code: z.string().trim().min(1, "رمز المادة مطلوب"),
  gradeLevelId: z.string().min(1, "الصفّ مطلوب"),
  color: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
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

  const grade = await prisma.gradeLevel.findUnique({
    where: { id: d.gradeLevelId },
    select: { id: true },
  });
  if (!grade) {
    return NextResponse.json({ error: "صفّ غير صالح" }, { status: 400 });
  }
  if (
    await prisma.subject.findUnique({
      where: { code: d.code },
      select: { id: true },
    })
  ) {
    return NextResponse.json(
      { error: "رمز المادة مستخدَم سابقاً" },
      { status: 409 }
    );
  }

  const created = await prisma.subject.create({
    data: {
      name: d.name,
      code: d.code,
      gradeLevelId: d.gradeLevelId,
      color: d.color || null,
      description: d.description || null,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
