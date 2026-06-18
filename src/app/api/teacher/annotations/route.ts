// src/app/api/teacher/annotations/route.ts
// POST: إضافة تعليق (دبّوس) على صورة إجابة. المدرّس مالك الاختبار حصراً.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  attachmentId: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  text: z.string().trim().min(1, "نصّ التعليق مطلوب").max(500),
});

export async function POST(req: Request) {
  const session = await getTeacherSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

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
      { status: 400 },
    );
  }
  const d = parsed.data;

  const att = await prisma.attachment.findUnique({
    where: { id: d.attachmentId },
    select: {
      kind: true,
      session: { select: { quiz: { select: { creatorId: true } } } },
    },
  });
  if (!att || att.kind !== "ANSWER_UPLOAD")
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (att.session?.quiz.creatorId !== session.sub)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });

  const created = await prisma.annotation.create({
    data: {
      attachmentId: d.attachmentId,
      authorId: session.sub,
      x: d.x,
      y: d.y,
      text: d.text,
    },
    select: { id: true },
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
