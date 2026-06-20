// src/app/api/admin/schools/[id]/route.ts
// PATCH: تعديل ملاحظات المؤسّسة الخاصّة. (المدير العام المُنشئ لها وحده.)
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  notes: z.string().trim().max(5000).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  if (!ctx.isSuper) {
    return NextResponse.json(
      { error: "إدارة المؤسّسات للمدير العام للمنصّة فقط" },
      { status: 403 }
    );
  }

  const school = await prisma.school.findUnique({
    where: { id: params.id },
    select: { id: true, createdById: true },
  });
  // الملاحظات خاصّة بمُنشئ المؤسّسة وحده.
  if (!school || school.createdById !== ctx.session.sub) {
    return NextResponse.json({ error: "المؤسّسة غير موجودة" }, { status: 404 });
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

  await prisma.school.update({
    where: { id: params.id },
    data: { notes: parsed.data.notes || null },
  });

  return NextResponse.json({ id: params.id });
}
