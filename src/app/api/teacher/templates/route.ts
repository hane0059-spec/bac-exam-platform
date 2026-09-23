// src/app/api/teacher/templates/route.ts
// POST: حفظ إعدادات اختبار حالية كقالب يعيد المدرّس استخدامه لاحقاً.
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1, "اسم القالب مطلوب").max(60),
  timeLimitSec: z.number().int().positive().nullable(),
  maxAttempts: z.number().int().min(1).max(10),
  revealAnswers: z.enum(["immediate", "end"]),
  shuffle: z.boolean(),
  allowCodeJoin: z.boolean(),
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

  try {
    const created = await prisma.quizTemplate.create({
      data: {
        teacherId: session.sub,
        name: d.name,
        timeLimitSec: d.timeLimitSec,
        maxAttempts: d.maxAttempts,
        revealAnswers: d.revealAnswers,
        shuffle: d.shuffle,
        allowCodeJoin: d.allowCodeJoin,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: created.id });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "لديك قالب بهذا الاسم من قبل — اختر اسماً آخر." },
        { status: 409 },
      );
    }
    throw e;
  }
}
