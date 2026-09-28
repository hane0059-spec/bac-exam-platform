// src/lib/quizGenerator.ts
// توليد اختبار (أو عدّة نماذج غير متطابقة) تلقائياً من بنك أسئلة المدرّس، بتوازن
// إلزامي لعدد كل نوع سؤال ودرجة كلية محدّدة. ميزة مستقلّة عن باني الشجرة اليدوي؛
// النتيجة اختبار عادي (Quiz+QuizNode/QuizEdge) يمرّ بنفس المسارات (نشر/إسناد/طباعة).
// بلا تغيير مخطط: يعيد استخدام QuizNode.pointsOverride لتوزيع الدرجة الكلية.
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "ESSAY",
  "MATCHING",
  "FILL_BLANK",
  "DIAGRAM_LABEL",
  "CALCULATION",
  "ORDER",
] as const;

export const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "اختيار",
  TRUE_FALSE: "صح/خطأ",
  SHORT_ANSWER: "قصيرة",
  ESSAY: "مقالي",
  ORDER: "ترتيب",
  FILL_BLANK: "ملء فراغات",
  MATCHING: "مطابقة",
  CALCULATION: "حساب",
  DIAGRAM_LABEL: "توسيم رسم",
};

export const scopeSchema = z
  .object({
    unitId: z.string().min(1).optional(),
    chapterId: z.string().min(1).optional(),
    conceptId: z.string().min(1).optional(),
  })
  .nullable();

export const generateRequestSchema = z.object({
  subjectId: z.string().min(1, "اختر المادة"),
  scope: scopeSchema,
  title: z.string().trim().min(1, "عنوان الاختبار مطلوب").max(120),
  targetTotal: z.number().positive().max(1000),
  modelsCount: z.number().int().min(1).max(7),
  requirements: z
    .array(
      z.object({
        type: z.enum(QUESTION_TYPES),
        count: z.number().int().min(0).max(200),
      })
    )
    .min(1)
    .refine((r) => r.some((x) => x.count > 0), "أدخل عدداً لنوع سؤال واحد على الأقلّ"),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type Scope = z.infer<typeof scopeSchema>;

/** شرط بنك الأسئلة المتاح لهذا المدرّس ضمن نطاق منهج اختياري. */
function bankWhere(teacherId: string, subjectId: string, scope: Scope) {
  const where: Record<string, unknown> = {
    creatorId: teacherId,
    subjectId,
    isActive: true,
    isCancelled: false,
    inBank: true,
  };
  if (scope?.chapterId) where.chapterId = scope.chapterId;
  else if (scope?.conceptId) where.conceptId = scope.conceptId;
  else if (scope?.unitId) where.chapter = { unitId: scope.unitId };
  return where;
}

/** عدد الأسئلة المتاحة لكل نوع ضمن النطاق — لمعاينة حيّة قبل التوليد. */
export async function countAvailableByType(
  teacherId: string,
  subjectId: string,
  scope: Scope
): Promise<Record<string, number>> {
  const rows = await prisma.question.groupBy({
    by: ["type"],
    where: bankWhere(teacherId, subjectId, scope),
    _count: { _all: true },
  });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.type] = r._count._all;
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * يوزّع الدرجة الكلية المستهدفة على الأسئلة المختارة تناسبياً مع درجتها
 * الأصلية (فيبقى السؤال الأصعب أثقل نسبيّاً)، بمجموع مطابق تماماً للهدف.
 */
export function distributeScore(
  selected: { id: string; points: number }[],
  targetTotal: number
): Map<string, number> {
  const sumOriginal = selected.reduce((s, q) => s + q.points, 0);
  const scale = sumOriginal > 0 ? targetTotal / sumOriginal : 0;
  const rounded = selected.map((q) => Math.max(0.25, Math.round(q.points * scale * 4) / 4));
  const diff =
    Math.round((targetTotal - rounded.reduce((s, v) => s + v, 0)) * 100) / 100;
  if (Math.abs(diff) >= 0.01 && rounded.length > 0) {
    let idx = 0;
    for (let i = 1; i < rounded.length; i++) if (rounded[i] > rounded[idx]) idx = i;
    rounded[idx] = Math.max(0.25, Math.round((rounded[idx] + diff) * 100) / 100);
  }
  const map = new Map<string, number>();
  selected.forEach((q, i) => map.set(q.id, rounded[i]));
  return map;
}

export interface RequirementShortfall {
  type: string;
  requested: number;
  available: number;
}

/** يتحقّق من كفاية البنك لكل الأنواع المطلوبة قبل أي محاولة توليد. */
export async function checkRequirements(
  teacherId: string,
  subjectId: string,
  scope: Scope,
  requirements: { type: string; count: number }[]
): Promise<RequirementShortfall[]> {
  const available = await countAvailableByType(teacherId, subjectId, scope);
  const shortfalls: RequirementShortfall[] = [];
  for (const r of requirements) {
    if (r.count <= 0) continue;
    const have = available[r.type] ?? 0;
    if (have < r.count) {
      shortfalls.push({ type: r.type, requested: r.count, available: have });
    }
  }
  return shortfalls;
}

export interface GeneratedModel {
  title: string;
  items: { questionId: string; pointsOverride: number }[];
}

/**
 * يسحب عشوائياً `modelsCount` نموذجاً مستقلّاً (كلٌّ بتوليفة عشوائية مختلفة)
 * — يفترض أنّ `checkRequirements` نجح أولاً. لا كتابة في القاعدة هنا؛ الاستدعاء
 * يبني فقط قوائم الأسئلة والدرجات، والحفظ الفعلي في المسار الذي يستدعيها.
 */
export async function generateModels(params: {
  teacherId: string;
  subjectId: string;
  scope: Scope;
  requirements: { type: string; count: number }[];
  targetTotal: number;
  modelsCount: number;
  baseTitle: string;
}): Promise<GeneratedModel[]> {
  const where = bankWhere(params.teacherId, params.subjectId, params.scope);
  // نجلب مرّة واحدة كل الأسئلة المرشَّحة لكل نوع مطلوب (كفاية مُتحقَّقة مسبقاً).
  const pools = new Map<string, { id: string; points: number }[]>();
  for (const r of params.requirements) {
    if (r.count <= 0) continue;
    if (pools.has(r.type)) continue;
    const rows = await prisma.question.findMany({
      where: { ...where, type: r.type as (typeof QUESTION_TYPES)[number] },
      select: { id: true, points: true },
    });
    pools.set(
      r.type,
      rows.map((q) => ({ id: q.id, points: Number(q.points) }))
    );
  }

  const models: GeneratedModel[] = [];
  for (let m = 1; m <= params.modelsCount; m++) {
    const selected: { id: string; points: number }[] = [];
    for (const r of params.requirements) {
      if (r.count <= 0) continue;
      const pool = pools.get(r.type) ?? [];
      selected.push(...shuffle(pool).slice(0, r.count));
    }
    const scoreMap = distributeScore(selected, params.targetTotal);
    models.push({
      title:
        params.modelsCount > 1 ? `${params.baseTitle} — نموذج ${m}` : params.baseTitle,
      items: selected.map((q) => ({
        questionId: q.id,
        pointsOverride: scoreMap.get(q.id)!,
      })),
    });
  }
  return models;
}
