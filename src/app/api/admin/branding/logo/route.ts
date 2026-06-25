// src/app/api/admin/branding/logo/route.ts
// POST: رفع شعار المنصّة (صورة). DELETE: حذفه والعودة للرمز الافتراضي.
// المدير العام حصراً.
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";
import { setBrandingLogo, clearBrandingLogo } from "@/lib/branding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_LOGO_BYTES = 1024 * 1024; // 1MB — الشعار صغير
const ALLOWED = ["image/png", "image/jpeg", "image/webp"]; // لا SVG (أمان)

export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  if (!ctx.isSuper)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "لا ملف مرفوع." }, { status: 400 });
  if (!ALLOWED.includes(file.type))
    return NextResponse.json(
      { error: "النوع غير مدعوم (PNG/JPEG/WebP فقط)." },
      { status: 400 },
    );
  if (file.size > MAX_LOGO_BYTES)
    return NextResponse.json(
      { error: "حجم الشعار يتجاوز 1 ميغابايت." },
      { status: 400 },
    );

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length === 0)
    return NextResponse.json({ error: "ملف فارغ." }, { status: 400 });

  await setBrandingLogo(file.type, buffer);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const ctx = await getAdminContext();
  if (!ctx) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  if (!ctx.isSuper)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });

  await clearBrandingLogo();
  return NextResponse.json({ ok: true });
}
