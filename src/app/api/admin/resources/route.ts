// src/app/api/admin/resources/route.ts
// POST: رفع ملفّ «أسئلة وإثراء» عامّ لصفّ معيّن. المدير العام فقط.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { validateResourceFile } from "@/lib/resources";

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

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "لا ملف مرفوع" }, { status: 400 });
  }
  const check = validateResourceFile(file);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const created = await prisma.enrichmentFile.create({
    data: {
      gradeLevelId,
      title: file.name.slice(0, 200) || "ملف.pdf",
      mimeType: file.type,
      sizeBytes: buffer.length,
      data: buffer,
      uploadedById: ctx.session.sub,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id });
}
