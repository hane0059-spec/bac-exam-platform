// src/app/api/teacher/questions/promote/route.ts
// POST: ترقية أسئلة مؤلَّفة فورياً إلى بنك الأسئلة (inBank=true). المدرّس المُنشئ فقط.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
});

export async function POST(req: Request) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  // ملكية: المدرّس المُنشئ فقط، وأسئلته خارج البنك.
  const result = await prisma.question.updateMany({
    where: {
      id: { in: parsed.data.ids },
      creatorId: session.sub,
      inBank: false,
    },
    data: { inBank: true },
  });
  return NextResponse.json({ promoted: result.count });
}
