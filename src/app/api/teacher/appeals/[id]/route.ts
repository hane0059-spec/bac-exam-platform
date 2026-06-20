// src/app/api/teacher/appeals/[id]/route.ts
// POST: ردّ المدرّس على اعتراض الطالب (قبول/رفض/إعادة فتح) + ملاحظة، وإشعار الطالب.
// القاعدة: المدرّس مالك اختبار الجلسة فقط.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["accept", "reject", "reopen"]),
  response: z.string().trim().max(1000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
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
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const { action, response } = parsed.data;

  const appeal = await prisma.gradeAppeal.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      studentId: true,
      session: {
        select: { quizId: true, quiz: { select: { creatorId: true, title: true } } },
      },
    },
  });
  // الملكية: المدرّس مالك اختبار الجلسة.
  if (!appeal || appeal.session.quiz.creatorId !== session.sub) {
    return NextResponse.json({ error: "الاعتراض غير موجود" }, { status: 404 });
  }

  const status =
    action === "accept" ? "ACCEPTED" : action === "reject" ? "REJECTED" : "OPEN";
  await prisma.gradeAppeal.update({
    where: { id: appeal.id },
    data: {
      status,
      teacherResponse: response || null,
      resolvedAt: action === "reopen" ? null : new Date(),
    },
  });

  // إشعار الطالب بالردّ (عدا إعادة الفتح).
  if (action !== "reopen") {
    try {
      const verdict = action === "accept" ? "قُبِل" : "رُفِض";
      await createNotification({
        userId: appeal.studentId,
        type: "appeal_resolved",
        message: `${verdict} اعتراضك على نتيجة «${appeal.session.quiz.title}».`,
        linkUrl: `/student/quizzes/${appeal.session.quizId}`,
      });
    } catch {
      // تجاهل أخطاء الإشعار.
    }
  }

  return NextResponse.json({ status });
}
