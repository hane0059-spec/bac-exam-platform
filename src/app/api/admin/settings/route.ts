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
import { setBranding, type Branding } from "@/lib/branding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// كائن هوية المنصّة — كل الحقول النصّية مقصوصة بحدود معقولة.
const brandingSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب").max(60),
  tagline: z.string().trim().max(120),
  showTagline: z.boolean(),
  hasLogo: z.boolean(),
  quote: z.string().trim().max(200),
  showQuote: z.boolean(),
  quoteSize: z.enum(["sm", "md", "lg", "xl"]),
  notice: z.string().trim().max(300),
  noticeType: z.enum(["info", "warning"]),
  maintenance: z.boolean(),
  maintenanceMessage: z.string().trim().max(300),
  contactEmail: z.string().trim().max(120),
  contactPhone: z.string().trim().max(60),
  about: z.string().trim().max(1000),
  showStudentLogin: z.boolean(),
  showTeacherLogin: z.boolean(),
  showAdminLogin: z.boolean(),
  showParentLogin: z.boolean(),
  windowsLayout: z.enum(["grid", "list"]),
});

const schema = z.object({
  font: z
    .enum(FONT_OPTIONS.map((f) => f.key) as [string, ...string[]])
    .optional(),
  platformMode: z
    .enum(PLATFORM_MODE_OPTIONS.map((m) => m.key) as [string, ...string[]])
    .optional(),
  branding: brandingSchema.optional(),
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
  if (parsed.data.branding) {
    await setBranding(parsed.data.branding as Branding);
  }
  return NextResponse.json({ ok: true });
}
