// src/app/api/teacher/parent-messages/[id]/route.ts
// POST: ردّ المدرّس على رسالة وليّ أمر، ويُشعَر الوليّ. الملكية: مالك اختبار الجلسة فقط.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  response: z.string().trim().min(1, "اكتب ردّاً").max(1000, "الردّ أطول من 1000 حرف"),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getTeacherSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  }

  const msg = await prisma.parentMessage.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      parentId: true,
      sessionId: true,
      studentId: true,
      session: { select: { quiz: { select: { creatorId: true, title: true } } } },
    },
  });
  if (!msg || msg.session.quiz.creatorId !== session.sub) {
    return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });
  }

  await prisma.parentMessage.update({
    where: { id: msg.id },
    data: {
      status: "ANSWERED",
      teacherResponse: parsed.data.response,
      respondedAt: new Date(),
    },
  });

  try {
    await createNotification({
      userId: msg.parentId,
      type: "parent_message_reply",
      message: `ردّ المدرّس على رسالتك بخصوص «${msg.session.quiz.title}».`,
      linkUrl: `/parent/students/${msg.studentId}/sessions/${msg.sessionId}`,
    });
  } catch {
    // تجاهل.
  }
  return NextResponse.json({ ok: true });
}
