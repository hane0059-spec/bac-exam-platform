// src/app/api/teacher/reports/[id]/route.ts
// POST: معالجة/تجاهل بلاغ خطأ على سؤال يملكه المدرّس (مع ملاحظة اختيارية).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["resolve", "dismiss", "reopen"]),
  note: z.string().trim().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getTeacherSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  const report = await prisma.questionReport.findUnique({
    where: { id: params.id },
    select: { id: true, question: { select: { creatorId: true } } },
  });
  if (!report || report.question.creatorId !== session.sub)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });

  const status =
    parsed.data.action === "resolve"
      ? "RESOLVED"
      : parsed.data.action === "dismiss"
        ? "DISMISSED"
        : "OPEN";

  await prisma.questionReport.update({
    where: { id: report.id },
    data: {
      status,
      teacherNote: parsed.data.note || null,
      resolvedAt: status === "OPEN" ? null : new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
