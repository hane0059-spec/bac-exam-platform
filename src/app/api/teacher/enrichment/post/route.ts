// src/app/api/teacher/enrichment/post/route.ts
// POST: منشور نصّي في «أسئلة وإثراء» الخاصّة بالمدرّس. نفس حراسة رفع الملفّات.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession, teacherCanEnrichment } from "@/lib/teacher";
import { MAX_POST_BODY, MAX_TITLE } from "@/lib/resources";
import {
  MAX_TEACHER_ENRICHMENT_ITEMS,
  teacherGradeLevels,
} from "@/lib/enrichment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  gradeLevelId: z.string().min(1, "اختر الصفّ"),
  title: z.string().trim().min(1, "العنوان مطلوب").max(MAX_TITLE),
  body: z
    .string()
    .trim()
    .min(1, "النصّ مطلوب")
    .max(MAX_POST_BODY, `النصّ حتى ${MAX_POST_BODY} حرفاً`),
});

export async function POST(req: Request) {
  const session = await getTeacherSession();
  if (!session) return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  if (!(await teacherCanEnrichment(session.sub)))
    return NextResponse.json(
      { error: "هذه الخاصّية غير مفعّلة لحسابك — اطلبها من المدير العام." },
      { status: 403 },
    );

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 },
    );
  const d = parsed.data;

  const grades = await teacherGradeLevels(session.sub);
  if (!grades.some((g) => g.id === d.gradeLevelId))
    return NextResponse.json({ error: "صفّ غير مسموح" }, { status: 400 });

  const count = await prisma.enrichmentFile.count({ where: { teacherId: session.sub } });
  if (count >= MAX_TEACHER_ENRICHMENT_ITEMS)
    return NextResponse.json(
      { error: `بلغت الحدّ الأقصى (${MAX_TEACHER_ENRICHMENT_ITEMS} عنصراً) — احذف قديماً أولاً.` },
      { status: 400 },
    );

  const created = await prisma.enrichmentFile.create({
    data: {
      gradeLevelId: d.gradeLevelId,
      kind: "TEXT",
      title: d.title,
      body: d.body,
      mimeType: "text/plain",
      sizeBytes: Buffer.byteLength(d.body, "utf8"),
      uploadedById: session.sub,
      teacherId: session.sub,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
