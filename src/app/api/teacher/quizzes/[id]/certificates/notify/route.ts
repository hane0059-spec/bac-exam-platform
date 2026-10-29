// src/app/api/teacher/quizzes/[id]/certificates/notify/route.ts
// POST: إشعار عدّة طلاب دفعةً واحدة بأنّ مدرّسهم أصدر لهم شهادة (بالتصميم نفسه الذي اختاره).
// الحراسة: مدرّس فعّال مالك الاختبار؛ لا يُشعَر إلا من له شهادة مؤهّلة (أفضل جلسة معتمدة)، وغيرهم يُتجاهَل.
// بلا تكرار: من أُشعِر سابقاً يُحدَّث تصميمه فقط. التصميم يُحفَظ صفّاً واحداً للاختبار (لا نسخة لكل طالب).
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { loadQuizCertificates } from "@/lib/certificateServer";
import { certificateNotifyMessage, planCertificateNotifications } from "@/lib/certificate";
import { createNotifications } from "@/lib/notifications";
import { normalizeIssuedStyle, saveIssuedStyleForQuiz } from "@/lib/certIssue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_STUDENTS = 300;
const bodySchema = z.object({
  sessionIds: z.array(z.string().min(1).max(64)).min(1).max(MAX_STUDENTS),
  style: z.unknown(),
});

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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
    return NextResponse.json(
      { error: `اختر طالباً واحداً على الأقل (حتى ${MAX_STUDENTS}).` },
      { status: 400 }
    );
  }
  const style = normalizeIssuedStyle(parsed.data.style);
  if (!style) {
    return NextResponse.json({ error: "تصميم الشهادة غير صالح." }, { status: 400 });
  }

  // الملكية + الأهلية: لا نثق بالمعرّفات القادمة من العميل إلا بعد مطابقتها بشهادات هذا الاختبار.
  const certs = await loadQuizCertificates(params.id, session.sub);
  if (!certs.ok) {
    return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
  }

  const linkUrl = `/student/certificate/${params.id}`;
  const already = await prisma.notification.findMany({
    where: {
      type: "certificate_issued",
      linkUrl,
      userId: { in: certs.items.map((i) => i.studentId) },
    },
    select: { userId: true },
  });
  const plan = planCertificateNotifications(
    certs.items,
    parsed.data.sessionIds,
    new Set(already.map((n) => n.userId))
  );
  const targeted = [...plan.toNotify, ...plan.restyle];
  if (targeted.length === 0) {
    return NextResponse.json({ error: "لا شهادة مؤهَّلة بين المحدَّدين." }, { status: 409 });
  }

  await saveIssuedStyleForQuiz(
    params.id,
    style,
    targeted.map((t) => t.studentId)
  );
  await createNotifications(
    plan.toNotify.map((t) => ({
      userId: t.studentId,
      type: "certificate_issued",
      message: certificateNotifyMessage(certs.quizTitle, t.data.percentage),
      linkUrl,
    }))
  );

  return NextResponse.json({
    ok: true,
    notified: plan.toNotify.length,
    restyled: plan.restyle.length,
    skipped: plan.skipped.length,
  });
}
