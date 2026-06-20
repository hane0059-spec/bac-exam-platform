// src/app/api/admin/schools/route.ts
// POST: إنشاء مدرسة/معهد. (المدير العام للمنصّة حصراً.)
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { SOLO_MODE } from "@/lib/platformMode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1, "اسم المؤسّسة مطلوب"),
  type: z.enum(["مدرسة", "معهد"]).default("مدرسة"),
  // ملاحظات المُنشئ الخاصّة عن المؤسّسة (يراها/يحرّرها هو وحده).
  notes: z.string().trim().max(5000).optional(),
});

export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  if (!ctx.isSuper) {
    return NextResponse.json(
      { error: "إنشاء المؤسّسات للمدير العام للمنصّة فقط" },
      { status: 403 }
    );
  }
  if (SOLO_MODE) {
    return NextResponse.json(
      { error: "غير متاح في الوضع المبسّط" },
      { status: 403 }
    );
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
  const created = await prisma.school.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      notes: parsed.data.notes || null,
      createdById: ctx.session.sub,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
