// src/app/api/admin/resources/post/route.ts
// POST: منشور نصّي (عنوان + نصّ) يظهر كبطاقة إعلان في «أسئلة وإثراء» لصفّ. المدير العام فقط.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { MAX_POST_BODY, MAX_TITLE } from "@/lib/resources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  gradeLevelId: z.string().min(1, "اختر الصفّ"),
  title: z.string().trim().min(1, "العنوان مطلوب").max(MAX_TITLE),
  body: z.string().trim().min(1, "النصّ مطلوب").max(MAX_POST_BODY, `النصّ حتى ${MAX_POST_BODY} حرفاً`),
});

export async function POST(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx || !ctx.isSuper)
    return NextResponse.json({ error: "غير مخوّل" }, { status: 403 });

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

  const grade = await prisma.gradeLevel.findUnique({
    where: { id: d.gradeLevelId },
    select: { id: true },
  });
  if (!grade) return NextResponse.json({ error: "صفّ غير موجود" }, { status: 400 });

  const created = await prisma.enrichmentFile.create({
    data: {
      gradeLevelId: d.gradeLevelId,
      kind: "TEXT",
      title: d.title,
      body: d.body,
      mimeType: "text/plain",
      sizeBytes: Buffer.byteLength(d.body, "utf8"),
      uploadedById: ctx.session.sub,
    },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: created.id });
}
