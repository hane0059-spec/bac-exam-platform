// src/app/api/admin/resources/[id]/reject/route.ts
// POST { reason?: string }: المدير العام يرفض طلب نشر عنصر مدرّس على الصفحة العامّة.
// يبقى العنصر خاصّاً بمكتبة المدرّس، يُمحى الطلب (فيستطيع طلبه من جديد)، ويُشعَر المدرّس بالسبب إن كتبه المدير.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { clearRequest, listRequestedIds } from "@/lib/enrichmentRequest";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ reason: z.string().trim().max(300).optional() });

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const ctx = await getAdminContext();
  if (!ctx || !ctx.isSuper) return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "السبب أطول من 300 حرف" }, { status: 400 });

  // عنصر ما زال خاصّاً بمدرّس وعليه طلب نشر فعلاً.
  const item = await prisma.enrichmentFile.findUnique({
    where: { id: params.id },
    select: { teacherId: true, title: true },
  });
  if (!item?.teacherId) return NextResponse.json({ error: "العنصر غير موجود" }, { status: 404 });
  if (!(await listRequestedIds([params.id])).has(params.id))
    return NextResponse.json({ error: "لا طلب نشر على هذا العنصر" }, { status: 409 });

  await clearRequest(params.id);
  const reason = parsed.data.reason?.trim();
  await createNotification({
    userId: item.teacherId,
    type: "enrichment_rejected",
    message:
      `لم يُعتمد نشر «${item.title.slice(0, 80)}» على الصفحة العامّة، ويبقى في مكتبتك الخاصّة لطلابك.` +
      (reason ? ` السبب: ${reason}` : ""),
    linkUrl: "/teacher/enrichment",
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
