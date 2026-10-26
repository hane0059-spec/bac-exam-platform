// src/app/api/push/test/route.ts
// POST: إشعار تجريبي إلى أجهزة المستخدم نفسه (للتأكّد أنّ الإشعارات تصل).
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";
import { pushEnabled, sendPushToUsers } from "@/lib/push";
import { getBranding } from "@/lib/branding";
import { buildPushPayload } from "@/lib/pushPayload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  if (!pushEnabled()) return NextResponse.json({ error: "الإشعارات غير مفعّلة" }, { status: 404 });
  if (!checkRateLimit(`push-test:${session.sub}`, 5, 60 * 1000)) {
    return NextResponse.json({ error: "انتظر دقيقة ثم أعد المحاولة" }, { status: 429 });
  }
  const title = (await getBranding().catch(() => null))?.name || "إتقان";
  const r = await sendPushToUsers(
    [session.sub],
    buildPushPayload({ title, linkUrl: "/notifications", body: "✔ الإشعارات تعمل على هذا الجهاز" })
  );
  return NextResponse.json({ ok: true, sent: r.sent });
}
