// src/app/api/push/key/route.ts
// GET: مفتاح VAPID العام (غير سرّي) لمستخدم مسجَّل؛ 404 إن لم تُفعَّل الخاصّية في البيئة.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { pushPublicKey } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  const key = pushPublicKey();
  if (!key) return NextResponse.json({ error: "الإشعارات غير مفعّلة" }, { status: 404 });
  return NextResponse.json({ key });
}
