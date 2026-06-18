// src/app/api/admin/parents/[id]/links/route.ts
// POST: ربط طلاب إضافيين (بالرموز). DELETE: فكّ ربط طالب. المدير حصراً، بعزل المؤسّسة.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { parentLinkSchema, resolveStudentCodes } from "@/lib/parent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// يتحقّق أن الوليّ ضمن نطاق المدير ويُعيد مؤسّسته.
async function loadParentInScope(parentId: string) {
  const ctx = await getAdminContext();
  if (!ctx) return { error: NextResponse.json({ error: "غير مخوّل" }, { status: 401 }) };
  const parent = await prisma.user.findUnique({
    where: { id: parentId },
    select: { id: true, role: true, schoolId: true },
  });
  if (!parent || parent.role !== "PARENT") {
    return { error: NextResponse.json({ error: "ولي أمر غير موجود" }, { status: 404 }) };
  }
  // عزل المؤسّسة: مدير المدرسة لا يدير أولياء خارج مؤسّسته.
  if (!ctx.isSuper && parent.schoolId !== ctx.schoolId) {
    return { error: NextResponse.json({ error: "غير مخوّل" }, { status: 403 }) };
  }
  return { ctx, parent };
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const loaded = await loadParentInScope(params.id);
  if ("error" in loaded) return loaded.error;
  const { parent } = loaded;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = parentLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const { ids, unknown } = await resolveStudentCodes(
    parsed.data.studentCodes,
    parent.schoolId,
  );
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: `رموز طلاب غير موجودة في المؤسّسة: ${unknown.join("، ")}` },
      { status: 400 },
    );
  }

  // createMany مع تجاهل المكرّر (الرابط فريد).
  await prisma.parentLink.createMany({
    data: ids.map((studentId) => ({ parentId: parent.id, studentId })),
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({ studentId: z.string().min(1) });

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  const loaded = await loadParentInScope(params.id);
  if ("error" in loaded) return loaded.error;
  const { parent } = loaded;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = deleteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  await prisma.parentLink.deleteMany({
    where: { parentId: parent.id, studentId: parsed.data.studentId },
  });

  return NextResponse.json({ ok: true });
}
