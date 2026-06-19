// src/lib/teacherQuiz.ts
// منطق تكوين الاختبارات للمدرّس: التحقّق، الملكية، وبناء شجرة العُقد الخطّية.
import { z } from "zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────
// مخطّطات التحقّق
// ─────────────────────────────────────────────

export const quizCreateSchema = z.object({
  title: z.string().trim().min(1, "عنوان الاختبار مطلوب"),
  subjectId: z.string().min(1, "المادة مطلوبة"),
});

const settingsSchema = z.object({
  timeLimitSec: z.number().int().positive().nullable(),
  maxAttempts: z.number().int().min(1).max(10),
  revealAnswers: z.enum(["immediate", "end"]),
  shuffle: z.boolean().default(false),
});

export const quizSaveSchema = z
  .object({
    title: z.string().trim().min(1, "عنوان الاختبار مطلوب"),
    description: z.string().trim().optional(),
    allowCodeJoin: z.boolean().default(false),
    settings: settingsSchema,
    availableFrom: z.string().datetime().nullable().optional(),
    availableUntil: z.string().datetime().nullable().optional(),
    questions: z.array(
      z.object({
        questionId: z.string().min(1),
        pointsOverride: z.number().positive().nullable(),
      })
    ),
  })
  .superRefine((d, ctx) => {
    if (
      d.availableFrom &&
      d.availableUntil &&
      new Date(d.availableFrom) >= new Date(d.availableUntil)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["availableUntil"],
        message: "تاريخ الانتهاء يجب أن يكون بعد البداية",
      });
    }
  });

export type QuizSaveInput = z.infer<typeof quizSaveSchema>;

// ─────────────────────────────────────────────
// الملكية
// ─────────────────────────────────────────────

/** رمز اختبار تسلسلي فريد: التالي بعد الأكبر الحالي (يبدأ من 1001). */
export async function nextAccessCode(): Promise<string> {
  const quizzes = await prisma.quiz.findMany({
    where: { accessCode: { not: null } },
    select: { accessCode: true },
  });
  let max = 1000;
  for (const { accessCode } of quizzes) {
    const n = parseInt(accessCode ?? "", 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}

export async function ownedQuiz(teacherId: string, quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.creatorId !== teacherId) return null;
  return quiz;
}

/** هل يمكن تعديل بنية الاختبار؟ (مسوّدة وبلا أي جلسات). */
export async function canEditStructure(
  quizId: string,
  status: string
): Promise<boolean> {
  if (status !== "DRAFT") return false;
  const sessions = await prisma.examSession.count({ where: { quizId } });
  return sessions === 0;
}

// ─────────────────────────────────────────────
// إعادة بناء شجرة العُقد (خطّي: بداية ← أسئلة ← نهاية)
// ─────────────────────────────────────────────

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function rebuildQuizGraph(
  tx: Tx,
  quizId: string,
  items: { questionId: string; pointsOverride: number | null }[]
) {
  await tx.quizEdge.deleteMany({ where: { quizId } });
  await tx.quizNode.deleteMany({ where: { quizId } });

  const start = await tx.quizNode.create({
    data: { quizId, nodeType: "START", positionX: 0, positionY: 0 },
  });

  const questionNodes = [];
  for (let i = 0; i < items.length; i++) {
    const node = await tx.quizNode.create({
      data: {
        quizId,
        nodeType: "QUESTION",
        questionId: items[i].questionId,
        pointsOverride:
          items[i].pointsOverride as unknown as Prisma.Decimal | null,
        positionX: (i + 1) * 200,
        positionY: 0,
      },
    });
    questionNodes.push(node);
  }

  const end = await tx.quizNode.create({
    data: {
      quizId,
      nodeType: "END",
      positionX: (items.length + 1) * 200,
      positionY: 0,
    },
  });

  const ordered = [start, ...questionNodes, end];
  for (let i = 0; i < ordered.length - 1; i++) {
    await tx.quizEdge.create({
      data: {
        quizId,
        sourceNodeId: ordered[i].id,
        targetNodeId: ordered[i + 1].id,
        conditionType: "ALWAYS",
        priority: 0,
      },
    });
  }

  await tx.quiz.update({
    where: { id: quizId },
    data: { startNodeId: start.id },
  });
}
