// src/app/api/push/subscribe/route.ts
// POST: تسجيل جهاز المستخدم الحالي لإشعارات الدفع. الجهاز المشترك يُنقَل لآخر مستخدم سجّل عليه.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";
import { pushEnabled } from "@/lib/push";
import { isAllowedPushEndpoint } from "@/lib/pushPayload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PER_USER = 10;

const schema = z.object({
  // حصر العنوان في خدمات الدفع المعروفة (منع SSRF: الخادم هو من يطلب هذا العنوان).
  endpoint: z.string().url().max(2000).refine(isAllowedPushEndpoint, "خدمة دفع غير معروفة"),
  keys: z.object({
    p256dh: z.string().min(10).max(300),
    auth: z.string().min(10).max(100),
  }),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  if (!pushEnabled()) return NextResponse.json({ error: "الإشعارات غير مفعّلة" }, { status: 404 });
  if (!checkRateLimit(`push-sub:${session.sub}`, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "محاولات كثيرة، أعد لاحقاً" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 300) || null;

  await prisma.$transaction(async (tx) => {
    await tx.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: session.sub, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
      update: { userId: session.sub, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    });
    // سقف الأجهزة لكل مستخدم: الأقدم يُحذف.
    const mine = await tx.pushSubscription.findMany({
      where: { userId: session.sub },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (mine.length > MAX_PER_USER) {
      await tx.pushSubscription.deleteMany({
        where: { id: { in: mine.slice(MAX_PER_USER).map((m) => m.id) } },
      });
    }
  });
  return NextResponse.json({ ok: true });
}
