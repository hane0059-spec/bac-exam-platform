// src/app/api/admin/parents/route.ts
// POST: إنشاء حساب ولي أمر وربطه بطلاب (بالرموز). المدير حصراً، بعزل المؤسّسة.
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { parentCreateSchema, resolveStudentCodes } from "@/lib/parent";
import { isSoloMode } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  if (await isSoloMode()) {
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
  const parsed = parentCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const email = d.email ? d.email.toLowerCase() : null;

  // مؤسّسة الوليّ: مدير المدرسة يورّث مؤسّسته؛ المدير العام يختار.
  const schoolId = ctx.isSuper ? d.schoolId ?? null : ctx.schoolId;

  if (
    email &&
    (await prisma.user.findUnique({ where: { email }, select: { id: true } }))
  ) {
    return NextResponse.json(
      { error: "البريد الإلكتروني مستخدَم سابقاً" },
      { status: 409 },
    );
  }

  // حلّ رموز الطلاب ضمن مؤسّسة الوليّ.
  const { ids, unknown } = await resolveStudentCodes(d.studentCodes, schoolId);
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: `رموز طلاب غير موجودة في المؤسّسة: ${unknown.join("، ")}` },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(d.password, 10);

  const created = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "PARENT",
      gender: d.gender,
      firstName: d.firstName,
      lastName: d.lastName,
      schoolId,
      createdById: ctx.session.sub,
      creatorNotes: d.creatorNotes || null,
      parentLinks: {
        create: ids.map((studentId) => ({ studentId })),
      },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
