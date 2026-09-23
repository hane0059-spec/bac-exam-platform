// src/app/api/teacher/questions/import/route.ts
// استيراد أسئلة من ملفّ بنك (JSON) إلى بنك المدرّس.
// dryRun=true: معاينة بلا كتابة. dryRun=false: إدراج الصالح في معاملة واحدة.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTeacherSession, teacherTeachesSubject } from "@/lib/teacher";
import {
  prepareImport,
  placementPreview,
  commitImport,
} from "@/lib/questionImportServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  subjectId: z.string().min(1, "المادة مطلوبة"),
  chapterId: z.string().min(1).nullish(),
  conceptId: z.string().min(1).nullish(),
  dryRun: z.boolean().default(true),
  file: z.unknown(),
});

export async function POST(req: Request) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }
  const { subjectId, dryRun } = parsed.data;
  const chapterId = parsed.data.chapterId ?? null;
  const conceptId = parsed.data.conceptId ?? null;

  // الملكية: المادة ضمن موادّ المدرّس.
  if (!(await teacherTeachesSubject(session.sub, subjectId))) {
    return NextResponse.json(
      { error: "لا تملك صلاحية على هذه المادة" },
      { status: 403 }
    );
  }
  if (chapterId) {
    const ch = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { subjectId: true },
    });
    if (!ch || ch.subjectId !== subjectId) {
      return NextResponse.json({ error: "فصل غير صالح" }, { status: 400 });
    }
  }
  if (conceptId) {
    const co = await prisma.concept.findUnique({
      where: { id: conceptId },
      select: { chapterId: true },
    });
    if (!co || (chapterId && co.chapterId !== chapterId)) {
      return NextResponse.json({ error: "مفهوم غير صالح" }, { status: 400 });
    }
  }

  let prepared;
  try {
    prepared = prepareImport(parsed.data.file, { subjectId, chapterId, conceptId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ملفّ غير صالح" },
      { status: 400 }
    );
  }

  if (dryRun) {
    const placement = await placementPreview(subjectId, prepared.valid);
    return NextResponse.json({
      dryRun: true,
      summary: { ...prepared.summary, placement },
    });
  }
  if (prepared.valid.length === 0) {
    return NextResponse.json(
      { error: "لا أسئلة صالحة للاستيراد" },
      { status: 400 }
    );
  }

  const done = await commitImport({
    subjectId,
    valid: prepared.valid,
    creatorId: session.sub,
  });

  return NextResponse.json({
    dryRun: false,
    importedCount: done.count,
    createdNodes: done.createdNodes,
    rejectedCount: prepared.rejected.length,
  });
}
