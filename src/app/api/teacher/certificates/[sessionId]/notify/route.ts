// src/app/api/teacher/certificates/[sessionId]/notify/route.ts
// POST: إشعار الطالب بأنّ مدرّسه أصدر له شهادة تقدير (تفتح صفحته الشهادة بالتصميم نفسه).
// الحراسة: مدرّس فعّال مالك الاختبار + الجلسة مؤهّلة (60% فأكثر ومعتمدة). مرّة واحدة لكل اختبار.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession } from "@/lib/teacher";
import { loadTeacherCertificate } from "@/lib/certificateServer";
import { createNotification } from "@/lib/notifications";
import { normalizeIssuedStyle, saveIssuedStyle } from "@/lib/certIssue";
import { certificateNotifyMessage } from "@/lib/certificate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, props: { params: Promise<{ sessionId: string }> }) {
  const params = await props.params;
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

  // تصميم الشهادة الذي اختاره المدرّس (اختياري للتوافق مع العملاء القدامى): يراه الطالب كما هو.
  const body = (await req.json().catch(() => null)) as { style?: unknown } | null;
  let styleSaved = false;
  if (body && body.style !== undefined) {
    const style = normalizeIssuedStyle(body.style);
    if (!style) {
      return NextResponse.json({ error: "تصميم الشهادة غير صالح." }, { status: 400 });
    }
    await saveIssuedStyle(cert.quizId, cert.studentId, style);
    styleSaved = true;
  }

  const linkUrl = `/student/certificate/${cert.quizId}`;
  const exists = await prisma.notification.findFirst({
    where: { userId: cert.studentId, type: "certificate_issued", linkUrl },
    select: { id: true },
  });
  if (exists) return NextResponse.json({ ok: true, alreadyNotified: true, styleUpdated: styleSaved });

  await createNotification({
    userId: cert.studentId,
    type: "certificate_issued",
    message: certificateNotifyMessage(cert.data.quizTitle, cert.data.percentage),
    linkUrl,
  });
  return NextResponse.json({ ok: true });
}
