// src/app/api/notifications/read/route.ts
// POST: تعليم إشعار واحد (id) أو الكل كمقروء — لصاحب الجلسة فقط.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { markRead } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ id: z.string().min(1).optional() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });

  let raw: unknown = {};
  try {
    raw = await req.json();
  } catch {
    // جسم فارغ = تعليم الكل.
  }
  const parsed = schema.safeParse(raw ?? {});
  const id = parsed.success ? parsed.data.id : undefined;

  await markRead(session.sub, id);
  return NextResponse.json({ ok: true });
}
