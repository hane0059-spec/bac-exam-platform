// src/app/api/admin/settings/route.ts
// POST: حفظ إعدادات المنصّة (الخطّ). المدير العام حصراً.
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin";
import {
  setAppFont,
  setPlatformMode,
  FONT_OPTIONS,
  PLATFORM_MODE_OPTIONS,
} from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  font: z
    .enum(FONT_OPTIONS.map((f) => f.key) as [string, ...string[]])
    .optional(),
  platformMode: z
    .enum(PLATFORM_MODE_OPTIONS.map((m) => m.key) as [string, ...string[]])
    .optional(),
});

export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  // إعداد على مستوى المنصّة — للمدير العام حصراً.
  if (!ctx.isSuper)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "قيمة غير صالحة" }, { status: 400 });
  }

  if (parsed.data.font) {
    await setAppFont(parsed.data.font as Parameters<typeof setAppFont>[0]);
  }
  if (parsed.data.platformMode) {
    await setPlatformMode(
      parsed.data.platformMode as Parameters<typeof setPlatformMode>[0]
    );
  }
  return NextResponse.json({ ok: true });
}
