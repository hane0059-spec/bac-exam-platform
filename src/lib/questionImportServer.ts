// src/lib/questionImportServer.ts
// تحضير الاستيراد على الخادم: تطبيع الملفّ ← تحقّق كل سؤال بمخطّط المدرّس ←
// بناء ملخّص المعاينة. مشترك بين استيراد المدرّس واستيراد المدير للبنك العام.
import { questionInputSchema } from "@/lib/teacher";
import {
  normalizeBankJson,
  Q_TYPE_LABEL,
  type NormalizedQuestion,
} from "@/lib/questionImport";

export interface ImportTargets {
  subjectId: string;
  chapterId: string | null;
  conceptId: string | null;
}

type ParsedInput = ReturnType<typeof questionInputSchema.safeParse>;
export interface ValidItem {
  n: NormalizedQuestion;
  data: ParsedInput;
}
export interface RejectRow {
  sourceId: string;
  sourceType: string;
  reason: string;
}

export interface PreparedImport {
  valid: ValidItem[];
  rejected: RejectRow[];
  summary: ReturnType<typeof buildSummary>;
}

function toQuestionInput(n: NormalizedQuestion, t: ImportTargets): ParsedInput {
  return questionInputSchema.safeParse({
    type: n.type,
    subjectId: t.subjectId,
    chapterId: t.chapterId,
    conceptId: t.conceptId,
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

function buildSummary(
  result: ReturnType<typeof normalizeBankJson>,
  valid: ValidItem[],
  rejected: RejectRow[]
) {
  return {
    subjectName: result.subjectName,
    total: result.total,
    importable: valid.length,
    rejectedCount: rejected.length,
    totalPoints: valid.reduce((s, { n }) => s + n.points, 0),
    byType: Object.entries(result.byType)
      .filter(([, c]) => c > 0)
      .map(([t, c]) => ({
        type: t,
        label: Q_TYPE_LABEL[t as keyof typeof Q_TYPE_LABEL],
        count: c,
      })),
    warnings: result.items
      .filter((n) => n.warnings.length > 0)
      .map((n) => ({
        sourceId: n.sourceId,
        type: n.type,
        typeLabel: Q_TYPE_LABEL[n.type],
        warnings: n.warnings,
      })),
    rejected: rejected.slice(0, 50),
    sample: result.items.slice(0, 5).map((n) => ({
      sourceId: n.sourceId,
      type: n.type,
      typeLabel: Q_TYPE_LABEL[n.type],
      points: n.points,
      content: n.content.slice(0, 160),
    })),
  };
}

/** يطبّع الملفّ ويفرز الصالح من المرفوض ويبني الملخّص. يرمي إن كان الملفّ تالفاً. */
export function prepareImport(
  file: unknown,
  targets: ImportTargets
): PreparedImport {
  const result = normalizeBankJson(file);

  const valid: ValidItem[] = [];
  const rejected: RejectRow[] = [...result.errors];
  for (const n of result.items) {
    const data = toQuestionInput(n, targets);
    if (data.success) valid.push({ n, data });
    else
      rejected.push({
        sourceId: n.sourceId,
        sourceType: n.sourceType,
        reason: data.error.issues[0]?.message ?? "بيانات غير صالحة",
      });
  }

  return { valid, rejected, summary: buildSummary(result, valid, rejected) };
}
