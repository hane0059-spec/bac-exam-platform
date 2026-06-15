// src/lib/teacherStudents.ts
// منطق إدارة المدرّس لطلابه: الحراسة (المُنشئ فقط) والتحقّق من المُدخلات.
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/** يُعيد الطالب إن كان من إنشاء هذا المدرّس فقط، وإلا null. */
export async function ownedStudent(teacherId: string, studentId: string) {
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (
    !student ||
    student.role !== "STUDENT" ||
    student.createdById !== teacherId
  ) {
    return null;
  }
  return student;
}

/** السنة الدراسية المعتمدة لمادة المدرّس (أو الحالية افتراضياً). */
export async function academicYearFor(
  teacherId: string,
  subjectId: string
): Promise<string> {
  const ts = await prisma.teacherSubject.findFirst({
    where: { teacherId, subjectId },
    orderBy: { academicYear: "desc" },
    select: { academicYear: true },
  });
  if (ts) return ts.academicYear;
  const y = new Date().getFullYear();
  return `${y}-${y + 1}`;
}

const genderEnum = z.enum(["MALE", "FEMALE"]);

export const studentCreateSchema = z.object({
  email: z.string().trim().email("بريد إلكتروني غير صالح"),
  password: z.string().min(6, "كلمة السر 6 أحرف على الأقل"),
  firstName: z.string().trim().min(1, "الاسم الأول مطلوب"),
  lastName: z.string().trim().min(1, "الاسم الأخير مطلوب"),
  gender: genderEnum,
  studentCode: z.string().trim().min(1, "رمز الطالب مطلوب"),
  gradeLevelId: z.string().min(1, "الصفّ مطلوب"),
  parentPhone: z.string().trim().optional(),
  enrollmentYear: z
    .number()
    .int()
    .min(2000)
    .max(2100)
    .default(new Date().getFullYear()),
  subjectId: z.string().min(1, "المادة مطلوبة"),
});

export const studentUpdateSchema = z.object({
  firstName: z.string().trim().min(1, "الاسم الأول مطلوب"),
  lastName: z.string().trim().min(1, "الاسم الأخير مطلوب"),
  gender: genderEnum,
  gradeLevelId: z.string().min(1, "الصفّ مطلوب"),
  parentPhone: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export const passwordSchema = z.object({
  password: z.string().min(6, "كلمة السر 6 أحرف على الأقل"),
});

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;
