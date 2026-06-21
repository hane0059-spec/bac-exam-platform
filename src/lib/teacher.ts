// src/lib/teacher.ts
// منطق المدرّس المشترك: الحراسة، ملكية المادة، وتحقّق مُدخلات السؤال.
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { countBlanks, parseNumber } from "@/lib/grading";
import type { SessionData } from "@/lib/auth";

/** جلسة مدرّس صالحة أو null. */
export async function getTeacherSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session || session.role !== "TEACHER") return null;
  return session;
}

/** هل يُسمح لهذا المدرّس بإنشاء اختبارات ورقية/مرفوعة؟ (خاصّية يفعّلها المدير). */
export async function teacherCanFileExams(teacherId: string): Promise<boolean> {
  const p = await prisma.teacherProfile.findUnique({
    where: { userId: teacherId },
    select: { canFileExams: true },
  });
  return !!p?.canFileExams;
}

/** هل أذن المدير لهذا المدرّس بإضافة وإدارة الطلاب؟ (الإسناد حرّ دائماً.) */
export async function teacherCanManageStudents(
  teacherId: string
): Promise<boolean> {
  const p = await prisma.teacherProfile.findUnique({
    where: { userId: teacherId },
    select: { canManageStudents: true },
  });
  return !!p?.canManageStudents;
}

/** هل يدرّس هذا المدرّس هذه المادة؟ (تحقّق ملكية إلزامي). */
export async function teacherTeachesSubject(
  teacherId: string,
  subjectId: string
): Promise<boolean> {
  const link = await prisma.teacherSubject.findFirst({
    where: { teacherId, subjectId },
    select: { id: true },
  });
  return link !== null;
}

/** موادّ المدرّس مع فصولها ومفاهيمها — لنماذج إنشاء/تعديل الأسئلة. */
export function getTeacherSubjectTree(teacherId: string) {
  return prisma.subject.findMany({
    where: { teacherSubjects: { some: { teacherId } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      chapters: {
        orderBy: { orderNum: "asc" },
        select: {
          id: true,
          title: true,
          concepts: {
            orderBy: { title: "asc" },
            select: { id: true, title: true },
          },
        },
      },
    },
  });
}

// تسميات خيارات الاختيار من متعدد.
const MCQ_LABELS = ["أ", "ب", "ج", "د", "هـ", "و"];

/** تسمية الخيار حسب النوع وموضعه. */
export function optionLabel(
  type: string,
  index: number,
  content: string
): string {
  if (type === "TRUE_FALSE") return content; // «صح» / «خطأ»
  if (type === "FILL_BLANK" || type === "DIAGRAM_LABEL")
    return String(index + 1); // رقم الفراغ
  return MCQ_LABELS[index] ?? String(index + 1);
}

// ─────────────────────────────────────────────
// تحقّق مُدخلات السؤال
// ─────────────────────────────────────────────

const optionSchema = z.object({
  content: z.string().trim().min(1, "نصّ الخيار مطلوب"),
  isCorrect: z.boolean(),
});

const matchingPairSchema = z.object({
  left: z.string().trim().min(1, "العنصر الأيسر مطلوب"),
  right: z.string().trim().min(1, "العنصر الأيمن مطلوب"),
});

export const questionInputSchema = z
  .object({
    type: z.enum([
      "MULTIPLE_CHOICE",
      "TRUE_FALSE",
      "SHORT_ANSWER",
      "ESSAY",
      "ORDER",
      "FILL_BLANK",
      "MATCHING",
      "CALCULATION",
      "DIAGRAM_LABEL",
    ]),
    subjectId: z.string().min(1, "المادة مطلوبة"),
    chapterId: z.string().min(1).nullish(),
    conceptId: z.string().min(1).nullish(),
    content: z.string().trim().min(1, "نصّ السؤال مطلوب"),
    difficulty: z
      .enum(["EASY", "MEDIUM", "HARD", "EXPERT"])
      .default("MEDIUM"),
    points: z.number().positive("العلامة يجب أن تكون أكبر من صفر").default(1),
    explanation: z.string().trim().optional(),
    tags: z.array(z.string().trim().min(1)).default([]),
    options: z.array(optionSchema).default([]),
    acceptedAnswers: z.array(z.string().trim().min(1)).default([]),
    matchingPairs: z.array(matchingPairSchema).default([]),
    // false عند التأليف الفوريّ داخل باني الاختبار (خارج البنك حتّى الترقية).
    inBank: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    // المقالي يدويّ بالكامل: لا خيارات ولا إجابات مقبولة مطلوبة.
    if (data.type === "ESSAY") return;
    // الترتيب: عناصر تُدخَل بالترتيب الصحيح (2 إلى 8)، بلا «إجابة صحيحة».
    if (data.type === "ORDER") {
      if (data.options.length < 2 || data.options.length > 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "سؤال الترتيب يتطلّب من 2 إلى 8 عناصر",
        });
      }
      return;
    }
    if (data.type === "SHORT_ANSWER") {
      if (data.acceptedAnswers.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["acceptedAnswers"],
          message: "أضف إجابة مقبولة واحدة على الأقل",
        });
      }
      return;
    }
    // الحساب: القيمة الصحيحة عددية (acceptedAnswers[0])، والهامش اختياري.
    if (data.type === "CALCULATION") {
      if (data.acceptedAnswers.length < 1 || parseNumber(data.acceptedAnswers[0]) == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["acceptedAnswers"],
          message: "أدخل القيمة الصحيحة كعدد",
        });
      }
      if (data.acceptedAnswers[1] != null && parseNumber(data.acceptedAnswers[1]) == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["acceptedAnswers"],
          message: "هامش الخطأ يجب أن يكون عدداً",
        });
      }
      return;
    }
    // توسيم الرسم: فراغات مرقّمة كملء الفراغات (1 إلى 12)، الصورة تُرفَع لاحقاً.
    if (data.type === "DIAGRAM_LABEL") {
      if (data.options.length < 1 || data.options.length > 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "أضف من 1 إلى 12 فراغاً مرقّماً",
        });
      }
      return;
    }
    // المطابقة: من 2 إلى 8 أزواج (أيسر ↔ أيمن).
    if (data.type === "MATCHING") {
      if (data.matchingPairs.length < 2 || data.matchingPairs.length > 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["matchingPairs"],
          message: "سؤال المطابقة يتطلّب من 2 إلى 8 أزواج",
        });
      }
      return;
    }
    // ملء الفراغات: خانة إجابات لكل علامة [[ ]] في النصّ، مطابقةً للعدد.
    if (data.type === "FILL_BLANK") {
      const blanks = countBlanks(data.content);
      if (blanks < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: "أضف فراغاً واحداً على الأقل بالعلامة [[ ]] في نصّ السؤال",
        });
      }
      if (blanks > 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["content"],
          message: "الحدّ الأقصى 8 فراغات في السؤال الواحد",
        });
      }
      if (data.options.length !== blanks) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "عدد خانات الإجابات لا يطابق عدد الفراغات في النصّ",
        });
      }
      return;
    }
    // اختيار من متعدد / صح-خطأ → خيارات بإجابة صحيحة واحدة.
    const min = data.type === "TRUE_FALSE" ? 2 : 2;
    const max = data.type === "TRUE_FALSE" ? 2 : 6;
    if (data.options.length < min || data.options.length > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message:
          data.type === "TRUE_FALSE"
            ? "صح/خطأ يتطلّب خيارين"
            : "أضف من 2 إلى 6 خيارات",
      });
    }
    const correct = data.options.filter((o) => o.isCorrect).length;
    if (correct !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "حدّد إجابة صحيحة واحدة بالضبط",
      });
    }
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;
