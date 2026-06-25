// src/app/api/branding/logo/route.ts
// GET: بثّ شعار المنصّة المرفوع — عامّ (هوية المنصّة، لا بيانات قُصّر).
import { NextResponse } from "next/server";
import { getBrandingLogo } from "@/lib/branding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const logo = await getBrandingLogo();
  if (!logo)
    return NextResponse.json({ error: "لا شعار" }, { status: 404 });

  return new NextResponse(new Uint8Array(logo.data), {
    headers: {
      "Content-Type": logo.mimeType,
      "Content-Disposition": "inline",
      // شعار عامّ — يجوز تخزينه مؤقّتاً لكن يتغيّر عند التحديث.
      "Cache-Control": "public, max-age=60",
    },
  });
}
