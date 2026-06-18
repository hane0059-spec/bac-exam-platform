// src/lib/fileExam.ts
// منطق الاختبار الورقي/المرفوع: إعدادات الدرجة، والتحقّق.
import { z } from "zod";

export interface FileExamSettings {
  maxScore: number;
  timeLimitSec: number | null;
  maxAttempts: number;
}

export function parseFileExamSettings(raw: unknown): FileExamSettings {
  const s = (raw ?? {}) as Record<string, unknown>;
  return {
    maxScore:
      typeof s.maxScore === "number" && s.maxScore > 0 ? s.maxScore : 20,
    timeLimitSec:
      typeof s.timeLimitSec === "number" && s.timeLimitSec > 0
        ? s.timeLimitSec
        : null,
    maxAttempts: 1,
  };
}

export const fileExamCreateSchema = z.object({
  title: z.string().trim().min(1, "عنوان الاختبار مطلوب"),
  subjectId: z.string().min(1, "المادة مطلوبة"),
  description: z.string().trim().optional(),
  maxScore: z.number().positive().max(1000),
  timeLimitSec: z.number().int().positive().nullable().optional(),
});

export const fileExamUpdateSchema = z
  .object({
    title: z.string().trim().min(1, "عنوان الاختبار مطلوب"),
    description: z.string().trim().optional(),
    maxScore: z.number().positive().max(1000),
    timeLimitSec: z.number().int().positive().nullable().optional(),
    availableFrom: z.string().datetime().nullable().optional(),
    availableUntil: z.string().datetime().nullable().optional(),
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

export const gradeFileSchema = z.object({
  score: z.number().min(0),
  feedback: z.string().trim().optional(),
});
