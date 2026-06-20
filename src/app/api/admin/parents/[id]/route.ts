// src/app/api/admin/parents/[id]/route.ts
// PATCH: تعديل ملاحظات المُنشئ عن وليّ الأمر. (مُنشئ الحساب وحده، بعزل المؤسّسة.)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { parentNotesSchema } from "@/lib/parent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const parent = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, schoolId: true, createdById: true },
  });
  if (!parent || parent.role !== "PARENT") {
    return NextResponse.json({ error: "وليّ الأمر غير موجود" }, { status: 404 });
  }
  // عزل المؤسّسة + الملاحظات خاصّة بمُنشئ الحساب وحده.
  if (!ctx.isSuper && parent.schoolId !== ctx.schoolId) {
    return NextResponse.json({ error: "وليّ الأمر غير موجود" }, { status: 404 });
  }
  if (parent.createdById !== ctx.session.sub) {
    return NextResponse.json(
      { error: "الملاحظات خاصّة بمُنشئ الحساب وحده" },
      { status: 403 }
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = parentNotesSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: params.id },
    data: { creatorNotes: parsed.data.notes || null },
  });

  return NextResponse.json({ id: params.id });
}
