// src/lib/selfRegister.ts
// التسجيل الذاتي للطالب عبر رمز QR الخاصّ باختبار: يُنشئ حسابه تلقائياً عند
// المدرّس مالك الاختبار (مؤسّسته، تسجيله في مادة الاختبار، وإسناد الاختبار).
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { hashPasswordFor } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";
import { isWithinWindow } from "@/lib/exam";
import { teacherCanManageStudents } from "@/lib/teacher";
import {
  academicYearFor,
  nextStudentCode,
  remainingStudentQuota,
  withStudentCreateLock,
} from "@/lib/teacherStudents";
import { createNotification } from "@/lib/notifications";

/** هل فعّل المدرّس التسجيل الذاتي في إعدادات الاختبار؟ */
export function selfRegisterEnabled(settings: unknown): boolean {
  return (
    !!settings &&
    typeof settings === "object" &&
    (settings as Record<string, unknown>).selfRegister === true
  );
}

export const selfRegisterSchema = z.object({
  firstName: z.string().trim().min(1, "الاسم الأول مطلوب").max(60),
  lastName: z.string().trim().min(1, "الاسم الأخير مطلوب").max(60),
  fatherName: z.string().trim().min(1, "اسم الأب مطلوب").max(60),
  gender: z.enum(["MALE", "FEMALE"]),
  password: z.string().min(6, "كلمة السر 6 أحرف على الأقل").max(100),
  phone: z.string().trim().max(30).optional(),
});
export type SelfRegisterInput = z.infer<typeof selfRegisterSchema>;

/** الاختبار الذي يقبل التسجيل الذاتي (أو null) — يُستخدم في الصفحة وفي المسار. */
export async function findSelfRegisterQuiz(code: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { accessCode: code },
    include: {
      subject: { select: { id: true, name: true, gradeLevelId: true } },
      creator: { select: { id: true, firstName: true, lastName: true, schoolId: true, isActive: true } },
    },
  });
  if (
    !quiz ||
    quiz.status !== "PUBLISHED" ||
    !quiz.allowCodeJoin ||
    !selfRegisterEnabled(quiz.settings) ||
    !quiz.creator.isActive ||
    !isWithinWindow(quiz.availableFrom, quiz.availableUntil)
  ) {
    return null;
  }
  // الصلاحية تُفحَص لحظة التسجيل أيضاً (قد تُسحَب من المدرّس بعد التفعيل).
  if (!(await teacherCanManageStudents(quiz.creator.id))) return null;
  return quiz;
}

export type RegisterResult =
  | { ok: true; studentId: string; studentCode: string; firstName: string; lastName: string; gender: "MALE" | "FEMALE"; quizTitle: string; quizId: string }
  | { ok: false; status: number; error: string };

export async function registerStudentViaQuiz(
  code: string,
  d: SelfRegisterInput,
): Promise<RegisterResult> {
  const quiz = await findSelfRegisterQuiz(code);
  if (!quiz) {
    return { ok: false, status: 404, error: "التسجيل عبر هذا الرمز غير متاح حالياً." };
  }
  const teacherId = quiz.creator.id;

  const academicYear = await academicYearFor(teacherId, quiz.subject.id);
  const passwordHash = await hashPasswordFor("STUDENT", d.password);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      // الحدّ (للمدرّس المستقلّ) + الرمز التسلسلي + الإنشاء تحت قفل بمعاملته فقط (يمنع تجاوز الحدّ وتصادم الرموز عند مسح صفٍّ كاملٍ QR معاً).
      const created = await withStudentCreateLock(async (tx) => {
        const left = await remainingStudentQuota(teacherId, tx);
        if (left !== undefined && left < 1) return null;
        const studentCode = await nextStudentCode(tx);
        const row = await tx.user.create({
          data: {
            passwordHash,
            role: "STUDENT",
            gender: d.gender,
            firstName: d.firstName,
            lastName: d.lastName,
            phone: d.phone || null,
            schoolId: quiz.creator.schoolId ?? null,
            createdById: teacherId,
            studentProfile: {
              create: {
                studentCode,
                gradeLevelId: quiz.subject.gradeLevelId,
                fatherName: d.fatherName,
                enrollmentYear: new Date().getFullYear(),
              },
            },
            studentEnrollments: {
              create: [{ teacherId, subjectId: quiz.subject.id, academicYear }],
            },
            assignments: {
              create: [{ quizId: quiz.id, teacherId }],
            },
          },
          select: { id: true },
        });
        return { id: row.id, studentCode };
      });
      if (!created) {
        return {
          ok: false,
          status: 403,
          error: "بلغ المدرّس حدّ الطلاب المسموح — تواصل معه.",
        };
      }
      await createNotification({
        userId: teacherId,
        type: "JOINED",
        message: `سجّل ${d.firstName} ${d.lastName} حسابه ذاتياً عبر رمز اختبارك «${quiz.title}»`,
        linkUrl: `/teacher/students/${created.id}`,
      }).catch(() => {});
      return {
        ok: true,
        studentId: created.id,
        studentCode: created.studentCode,
        firstName: d.firstName,
        lastName: d.lastName,
        gender: d.gender,
        quizTitle: quiz.title,
        quizId: quiz.id,
      };
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002" &&
        Array.isArray(e.meta?.target) &&
        (e.meta?.target as string[]).some((t) => t.includes("student_code"))
      ) {
        continue;
      }
      throw e;
    }
  }
  return { ok: false, status: 500, error: "تعذّر توليد رمز فريد، حاول مجدداً." };
}
