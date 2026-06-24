// src/app/api/teacher/questions/import/route.ts
// استيراد أسئلة من ملفّ بنك (JSON) إلى بنك المدرّس.
// dryRun=true: معاينة (أعداد لكل نوع + تنبيهات + أخطاء) بلا كتابة.
// dryRun=false: إدراج الأسئلة الصالحة في معاملة واحدة. التطبيع على الخادم دائماً.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getTeacherSession,
  teacherTeachesSubject,
  questionInputSchema,
  optionLabel,
} from "@/lib/teacher";
import {
  normalizeBankJson,
  Q_TYPE_LABEL,
  type NormalizedQuestion,
} from "@/lib/questionImport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  subjectId: z.string().min(1, "المادة مطلوبة"),
  chapterId: z.string().min(1).nullish(),
  conceptId: z.string().min(1).nullish(),
  dryRun: z.boolean().default(true),
  file: z.unknown(), // كائن JSON الخام من الملفّ المرفوع
});

// يبني مُدخلات إنشاء السؤال من العنصر المُطبَّع + الأهداف، ويتحقّق بمخطط المدرّس.
function toQuestionInput(
  n: NormalizedQuestion,
  targets: { subjectId: string; chapterId: string | null; conceptId: string | null }
) {
  return questionInputSchema.safeParse({
    type: n.type,
    subjectId: targets.subjectId,
    chapterId: targets.chapterId,
    conceptId: targets.conceptId,
    content: n.content,
    difficulty: n.difficulty,
    points: n.points,
    explanation: n.explanation || undefined,
    tags: n.tags,
    options: n.options,
    acceptedAnswers: n.acceptedAnswers,
    matchingPairs: n.matchingPairs,
    inBank: true,
  });
}

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
  // صحّة الفصل/المفهوم ضمن المادة.
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

  // التطبيع على الخادم.
  let result;
  try {
    result = normalizeBankJson(parsed.data.file);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ملفّ غير صالح" },
      { status: 400 }
    );
  }

  const targets = { subjectId, chapterId, conceptId };

  // تحقّق نهائيّ بمخطّط المدرّس، وفرز الصالح من المرفوض.
  const valid: { n: NormalizedQuestion; data: ReturnType<typeof toQuestionInput> }[] =
    [];
  const rejected: { sourceId: string; sourceType: string; reason: string }[] = [
    ...result.errors,
  ];
  for (const n of result.items) {
    const v = toQuestionInput(n, targets);
    if (v.success) valid.push({ n, data: v });
    else
      rejected.push({
        sourceId: n.sourceId,
        sourceType: n.sourceType,
        reason: v.error.issues[0]?.message ?? "بيانات غير صالحة",
      });
  }

  const warnings = result.items
    .filter((n) => n.warnings.length > 0)
    .map((n) => ({
      sourceId: n.sourceId,
      type: n.type,
      typeLabel: Q_TYPE_LABEL[n.type],
      warnings: n.warnings,
    }));

  const totalPoints = valid.reduce((s, { n }) => s + n.points, 0);

  const summary = {
    subjectName: result.subjectName,
    total: result.total,
    importable: valid.length,
    rejectedCount: rejected.length,
    totalPoints,
    byType: Object.entries(result.byType)
      .filter(([, c]) => c > 0)
      .map(([t, c]) => ({
        type: t,
        label: Q_TYPE_LABEL[t as keyof typeof Q_TYPE_LABEL],
        count: c,
      })),
    warnings,
    rejected: rejected.slice(0, 50),
    sample: result.items.slice(0, 5).map((n) => ({
      sourceId: n.sourceId,
      type: n.type,
      typeLabel: Q_TYPE_LABEL[n.type],
      points: n.points,
      content: n.content.slice(0, 160),
    })),
  };

  if (dryRun) {
    return NextResponse.json({ dryRun: true, summary });
  }

  if (valid.length === 0) {
    return NextResponse.json(
      { error: "لا أسئلة صالحة للاستيراد" },
      { status: 400 }
    );
  }

  // الإدراج في معاملة واحدة.
  const created = await prisma.$transaction(
    valid.map(({ data }) => {
      const d = data.success ? data.data : null;
      if (!d) throw new Error("بيانات غير صالحة"); // لا يحدث (فُرز مسبقاً)
      const usesAccepted =
        d.type === "SHORT_ANSWER" || d.type === "CALCULATION";
      const isMatching = d.type === "MATCHING";
      return prisma.question.create({
        data: {
          creatorId: session.sub,
          subjectId: d.subjectId,
          chapterId: d.chapterId ?? null,
          conceptId: d.conceptId ?? null,
          inBank: true,
          type: d.type,
          content: d.content,
          difficulty: d.difficulty,
          points: d.points,
          explanation: d.explanation || null,
          tags: d.tags,
          acceptedAnswers: usesAccepted ? d.acceptedAnswers : [],
          options:
            usesAccepted || isMatching
              ? undefined
              : {
                  create: d.options.map((o, i) => ({
                    label: optionLabel(d.type, i, o.content),
                    content: o.content,
                    isCorrect: o.isCorrect,
                    orderNum: i,
                  })),
                },
          matchingPairs: isMatching
            ? {
                create: d.matchingPairs.map((p, i) => ({
                  leftItem: p.left,
                  rightItem: p.right,
                  orderNum: i,
                })),
              }
            : undefined,
        },
        select: { id: true },
      });
    })
  );

  return NextResponse.json({
    dryRun: false,
    importedCount: created.length,
    rejectedCount: rejected.length,
  });
}
