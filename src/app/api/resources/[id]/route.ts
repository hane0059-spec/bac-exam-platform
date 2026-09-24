// src/app/api/resources/[id]/route.ts
// GET: ملفّ «أسئلة وإثراء» — عامّ بلا تسجيل دخول، محدود بمعدّل الطلبات.
// الصور تُعرَض داخل الصفحة (inline) ولا تُحتسَب مشاهدتها؛ يُحتسَب التنزيل الفعلي
// (?dl=1 للصور، وكل طلب لبقية الملفّات). العدّاد يراه المدير العام فقط.
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { kindOfMime, safeContentDisposition } from "@/lib/resources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const wantsDownload = new URL(req.url).searchParams.get("dl") === "1";
  const ip = clientIp(req);
  // عرض الصور داخل الصفحة يحتاج حدّاً أوسع من التنزيل.
  const ok = wantsDownload
    ? checkRateLimit(`resource-dl:${ip}`, 60, 15 * 60 * 1000)
    : checkRateLimit(`resource-view:${ip}`, 600, 15 * 60 * 1000);
  if (!ok) {
    return NextResponse.json(
      { error: "طلبات كثيرة جداً — انتظر قليلاً ثم أعد المحاولة." },
      { status: 429 },
    );
  }

  const meta = await prisma.enrichmentFile.findUnique({
    where: { id: params.id },
    select: { kind: true, mimeType: true },
  });
  if (!meta || meta.kind !== "FILE")
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const isImage = kindOfMime(meta.mimeType) === "image";
  const inline = isImage && !wantsDownload;
  const counts = !isImage || wantsDownload;

  let file;
  try {
    file = counts
      ? await prisma.enrichmentFile.update({
          where: { id: params.id },
          data: { downloadCount: { increment: 1 } },
          select: { title: true, mimeType: true, data: true },
        })
      : await prisma.enrichmentFile.findUniqueOrThrow({
          where: { id: params.id },
          select: { title: true, mimeType: true, data: true },
        });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === "P2025" || e.code === "P2018")
    ) {
      return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    }
    throw e;
  }
  if (!file.data)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": safeContentDisposition(
        file.title,
        inline ? "inline" : "attachment",
      ),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
