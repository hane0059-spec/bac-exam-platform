// src/app/api/push/unsubscribe/route.ts
// POST: إلغاء اشتراك جهاز — لصاحبه فقط.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ endpoint: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId: session.sub },
  });
  return NextResponse.json({ ok: true });
}
