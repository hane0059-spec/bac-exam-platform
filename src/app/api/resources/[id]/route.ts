// src/app/api/resources/[id]/route.ts
// GET: تنزيل ملفّ «أسئلة وإثراء» — عامّ بلا تسجيل دخول، محدود بمعدّل الطلبات.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { safeContentDisposition } from "@/lib/resources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  if (!checkRateLimit(`resource-dl:${clientIp(req)}`, 60, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "طلبات كثيرة جداً — انتظر قليلاً ثم أعد المحاولة." },
      { status: 429 },
    );
  }

  const file = await prisma.enrichmentFile.findUnique({
    where: { id: params.id },
    select: { title: true, mimeType: true, data: true },
  });
  if (!file) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": safeContentDisposition(file.title),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
