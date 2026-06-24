// src/lib/questionCreate.ts
// بناء حمولة إنشاء السؤال في Prisma من مُدخلات مُتحقَّقة — مشترك بين الإنشاء
// والاستيراد (مدرّس/مدير) والنسخ من البنك العام.
import { optionLabel, type QuestionInput } from "@/lib/teacher";

/** يبني `data` لإنشاء سؤال مع خياراته/أزواجه حسب نوعه. */
export function buildQuestionCreateData(
  d: QuestionInput,
  opts: { creatorId: string; isPublic?: boolean }
) {
  const usesAccepted = d.type === "SHORT_ANSWER" || d.type === "CALCULATION";
  const isMatching = d.type === "MATCHING";
  return {
    creatorId: opts.creatorId,
    subjectId: d.subjectId,
    chapterId: d.chapterId ?? null,
    conceptId: d.conceptId ?? null,
    inBank: d.inBank,
    isPublic: opts.isPublic ?? false,
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
  };
}
