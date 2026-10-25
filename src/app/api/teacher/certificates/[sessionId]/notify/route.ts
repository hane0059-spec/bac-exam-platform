// src/app/api/teacher/certificates/[sessionId]/notify/route.ts
// POST: إشعار الطالب بأنّ مدرّسه أصدر له شهادة تقدير (تفتح صفحته الشهادة بالتصميم نفسه).
// الحراسة: مدرّس فعّال مالك الاختبار + الجلسة مؤهّلة (60% فأكثر ومعتمدة). مرّة واحدة لكل اختبار.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { loadTeacherCertificate } from "@/lib/certificateServer";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  const cert = await loadTeacherCertificate(params.sessionId, session.sub);
  if (!cert.ok) {
    return NextResponse.json(
      { error: cert.reason === "ineligible" ? cert.message : "الجلسة غير موجودة" },
      { status: cert.reason === "ineligible" ? 409 : 404 }
    );
  }

  const linkUrl = `/student/certificate/${cert.quizId}`;
  const exists = await prisma.notification.findFirst({
    where: { userId: cert.studentId, type: "certificate_issued", linkUrl },
    select: { id: true },
  });
  if (exists) return NextResponse.json({ ok: true, alreadyNotified: true });

  await createNotification({
    userId: cert.studentId,
    type: "certificate_issued",
    message: `أصدر لك مدرّسك شهادة تقدير في اختبار «${cert.data.quizTitle}» (${cert.data.percentage}%) — افتحها وحمّلها.`,
    linkUrl,
  });
  return NextResponse.json({ ok: true });
}
