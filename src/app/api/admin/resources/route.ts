// src/app/api/admin/resources/route.ts
// POST: رفع ملفّ «أسئلة وإثراء» عامّ لصفّ معيّن. المدير العام فقط.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { resolveResourceMime, validateResourceBytes } from "@/lib/resources";
import { readUploadPayload } from "@/lib/chunkedUpload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx || !ctx.isSuper)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const gradeLevelId = form.get("gradeLevelId");
  if (typeof gradeLevelId !== "string" || !gradeLevelId) {
    return NextResponse.json({ error: "اختر الصفّ" }, { status: 400 });
  }
  const grade = await prisma.gradeLevel.findUnique({
    where: { id: gradeLevelId },
    select: { id: true },
  });
  if (!grade) return NextResponse.json({ error: "صفّ غير موجود" }, { status: 400 });

  // ملفّ كامل أو جزء من رفع مجزَّأ (الاستضافة ترفض الطلبات > ~4.5MB).
  const payload = await readUploadPayload(form, ctx.session.sub);
  if (payload.status === "error") {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }
  if (payload.status === "partial") {
    return NextResponse.json({ ok: true, partial: true });
  }
  const { buffer } = payload;
  const check = validateResourceBytes(
    resolveResourceMime(payload.name, payload.type),
    buffer.length,
    buffer.subarray(0, 16),
  );
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const created = await prisma.enrichmentFile.create({
    data: {
      gradeLevelId,
      title: payload.name.slice(0, 200) || "ملف",
      mimeType: check.mime,
      sizeBytes: buffer.length,
      data: buffer,
      uploadedById: ctx.session.sub,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id });
}
