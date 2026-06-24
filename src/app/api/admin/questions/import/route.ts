// src/app/api/admin/questions/import/route.ts
// المدير العام يستورد أسئلة من ملفّ إلى البنك العام (isPublic=true) لأيّ مادة.
// dryRun=true: معاينة. dryRun=false: إدراج في معاملة واحدة. التطبيع على الخادم.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { prepareImport } from "@/lib/questionImportServer";
import { buildQuestionCreateData } from "@/lib/questionCreate";

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
  const ctx = await getAdminContext();
  if (!ctx) {
    return NextResponse.json({ error: "غير مخوّل" }, { status: 401 });
  }
  if (!ctx.isSuper) {
    return NextResponse.json(
      { error: "البنك العام للمدير العام حصراً" },
      { status: 403 }
    );
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

  // صحّة المادة (عامّة، لا عزل مؤسّسة) والفصل/المفهوم ضمنها.
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });
  if (!subject) {
    return NextResponse.json({ error: "مادة غير صالحة" }, { status: 400 });
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
    return NextResponse.json({ dryRun: true, summary: prepared.summary });
  }
  if (prepared.valid.length === 0) {
    return NextResponse.json(
      { error: "لا أسئلة صالحة للاستيراد" },
      { status: 400 }
    );
  }

  // أسئلة البنك العام: مملوكة للمدير العام ومعلَّمة isPublic.
  const created = await prisma.$transaction(
    prepared.valid.map(({ data }) => {
      if (!data.success) throw new Error("بيانات غير صالحة");
      return prisma.question.create({
        data: buildQuestionCreateData(data.data, {
          creatorId: ctx.session.sub,
          isPublic: true,
        }),
        select: { id: true },
      });
    })
  );

  return NextResponse.json({
    dryRun: false,
    importedCount: created.length,
    rejectedCount: prepared.rejected.length,
  });
}
