// src/app/api/admin/fields/route.ts
// POST موحّد: إنشاء/تعديل/حذف حقل مخصّص. (المدير العام للمنصّة حصراً.)
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["create", "update", "delete"]),
  id: z.string().optional(),
  label: z.string().trim().optional(),
  fieldType: z.enum(["TEXT", "NUMBER", "SELECT"]).default("TEXT"),
  options: z.array(z.string().trim().min(1)).default([]),
  required: z.boolean().default(false),
  appliesTo: z.enum(["ALL", "STUDENT", "TEACHER", "ADMIN"]).default("ALL"),
  orderNum: z.number().int().min(0).default(0),
});

export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx || !ctx.isSuper) {
    return NextResponse.json(
      { error: "متاح للمدير العام فقط" },
      { status: 403 }
    );
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const p = schema.safeParse(raw);
  if (!p.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const d = p.data;

  if (d.action === "delete") {
    if (!d.id) return NextResponse.json({ error: "معرّف مطلوب" }, { status: 400 });
    await prisma.customFieldDef.delete({ where: { id: d.id } });
    return NextResponse.json({ ok: true });
  }

  if (!d.label) {
    return NextResponse.json({ error: "اسم الحقل مطلوب" }, { status: 400 });
  }
  const options = d.fieldType === "SELECT" ? d.options : [];

  if (d.action === "create") {
    const fieldKey = `f_${Math.random().toString(36).slice(2, 10)}`;
    const created = await prisma.customFieldDef.create({
      data: {
        label: d.label,
        fieldKey,
        fieldType: d.fieldType,
        options,
        required: d.required,
        appliesTo: d.appliesTo,
        orderNum: d.orderNum,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  }

  // update
  if (!d.id) return NextResponse.json({ error: "معرّف مطلوب" }, { status: 400 });
  await prisma.customFieldDef.update({
    where: { id: d.id },
    data: {
      label: d.label,
      fieldType: d.fieldType,
      options,
      required: d.required,
      appliesTo: d.appliesTo,
    },
  });
  return NextResponse.json({ id: d.id });
}
