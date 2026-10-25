// src/app/api/teacher/enrichment/route.ts
// POST: رفع ملفّ/صورة إلى «أسئلة وإثراء» الخاصّة بالمدرّس (لطلابه المسجّلين عنده فقط).
// الحراسة: مدرّس فعّال + فعّل المدير العام الخاصّية له + الصفّ من صفوف موادّه.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeacherSession, teacherCanEnrichment } from "@/lib/teacher";
import { resolveResourceMime, validateResourceBytes } from "@/lib/resources";
import { readUploadPayload } from "@/lib/chunkedUpload";
import {
  MAX_TEACHER_ENRICHMENT_ITEMS,
  teacherGradeLevels,
} from "@/lib/enrichment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getTeacherSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  if (!(await teacherCanEnrichment(session.sub)))
    return NextResponse.json(
      { error: "هذه الخاصّية غير مفعّلة لحسابك — اطلبها من المدير العام." },
      { status: 403 },
    );

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const gradeLevelId = form.get("gradeLevelId");
  if (typeof gradeLevelId !== "string" || !gradeLevelId)
    return NextResponse.json({ error: "اختر الصفّ" }, { status: 400 });
  const grades = await teacherGradeLevels(session.sub);
  if (!grades.some((g) => g.id === gradeLevelId))
    return NextResponse.json({ error: "صفّ غير مسموح" }, { status: 400 });

  const count = await prisma.enrichmentFile.count({ where: { teacherId: session.sub } });
  if (count >= MAX_TEACHER_ENRICHMENT_ITEMS)
    return NextResponse.json(
      { error: `بلغت الحدّ الأقصى (${MAX_TEACHER_ENRICHMENT_ITEMS} عنصراً) — احذف قديماً أولاً.` },
      { status: 400 },
    );

  // ملفّ كامل أو جزء من رفع مجزَّأ (الاستضافة ترفض الطلبات > ~4.5MB).
  const payload = await readUploadPayload(form, session.sub);
  if (payload.status === "error")
    return NextResponse.json({ error: payload.error }, { status: 400 });
  if (payload.status === "partial")
    return NextResponse.json({ ok: true, partial: true });
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
      uploadedById: session.sub,
      teacherId: session.sub,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
