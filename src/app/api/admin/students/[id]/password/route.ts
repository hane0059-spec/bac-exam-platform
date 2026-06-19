// src/app/api/admin/students/[id]/password/route.ts
// POST: إعادة تعيين كلمة سرّ طالب من المدير (بعزل المؤسّسة).
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { passwordSchema } from "@/lib/teacherStudents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const student = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, schoolId: true },
  });
  if (!student || student.role !== "STUDENT")
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  if (ctx.isSchoolManager && student.schoolId !== ctx.schoolId)
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "كلمة سر غير صالحة" },
      { status: 400 },
    );

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.update({
    where: { id: params.id },
    data: { passwordHash },
  });
  return NextResponse.json({ ok: true });
}
