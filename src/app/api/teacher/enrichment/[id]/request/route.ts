// src/app/api/teacher/enrichment/[id]/request/route.ts
// POST { requested: boolean }: المدرّس يطلب نشر عنصره الخاصّ على صفحة «أسئلة وإثراء» العامّة (أو يلغي الطلب).
// الملكية: عنصره هو فقط وما زال خاصّاً. الطلب الجديد يُشعِر المدير العام مرّة واحدة.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession, teacherCanEnrichment } from "@/lib/teacher";
import { checkRateLimit } from "@/lib/rateLimit";
import { clearRequest, createRequest } from "@/lib/enrichmentRequest";
import { createNotifications } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ requested: z.boolean() });

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await getTeacherSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  if (!(await teacherCanEnrichment(session.sub)))
    return NextResponse.json({ error: "الخاصّية غير مفعّلة لحسابك" }, { status: 403 });
  if (!checkRateLimit(`enrich-req:${session.sub}`, 20, 10 * 60 * 1000))
    return NextResponse.json({ error: "طلبات كثيرة — انتظر قليلاً" }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

  // الملكية + ما زال خاصّاً (teacherId = هو): العنصر المعتمَد سابقاً لا يُطلَب نشره.
  const item = await prisma.enrichmentFile.findFirst({
    where: { id: params.id, teacherId: session.sub },
    select: { id: true, title: true },
  });
  if (!item) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  if (!parsed.data.requested) {
    await clearRequest(item.id);
    return NextResponse.json({ ok: true, requested: false });
  }

  const created = await createRequest(item.id);
  if (created) {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isSuperAdmin: true, isActive: true },
      select: { id: true },
    });
    await createNotifications(
      admins.map((a) => ({
        userId: a.id,
        type: "enrichment_publish_request",
        message: `طلب مدرّس نشر «${item.title.slice(0, 80)}» على صفحة «أسئلة وإثراء» العامّة.`,
        linkUrl: "/admin/resources",
      })),
    ).catch(() => {});
  }
  return NextResponse.json({ ok: true, requested: true });
}
