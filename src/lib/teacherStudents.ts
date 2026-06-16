// src/lib/teacherStudents.ts
// منطق إدارة المدرّس لطلابه: الحراسة (المُنشئ فقط)، توليد رمز الطالب، والتحقّق.
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

/** رمز طالب تسلسلي فريد: التالي بعد الأكبر الحالي (S-1002 ...). */
export async function nextStudentCode(): Promise<string> {
  const codes = await prisma.studentProfile.findMany({
    select: { studentCode: true },
  });
  let max = 1000;
  for (const { studentCode } of codes) {
    const m = studentCode.match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `S-${max + 1}`;
}

const genderEnum = z.enum(["MALE", "FEMALE"]);
// بريد اختياري: السلسلة الفارغة تُعامَل كغياب.
const optionalEmail = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().trim().email("بريد إلكتروني غير صالح").optional()
);

export const studentCreateSchema = z.object({
  email: optionalEmail,
  password: z.string().min(6, "كلمة السر 6 أحرف على الأقل"),
  firstName: z.string().trim().min(1, "الاسم الأول مطلوب"),
  lastName: z.string().trim().min(1, "الاسم الأخير مطلوب"),
  fatherName: z.string().trim().min(1, "اسم الأب مطلوب"),
  motherName: z.string().trim().optional(),
  gender: genderEnum,
  gradeLevelId: z.string().min(1, "الصفّ مطلوب"),
  address: z.string().trim().optional(),
  studentPhone: z.string().trim().optional(),
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
  email: optionalEmail,
  firstName: z.string().trim().min(1, "الاسم الأول مطلوب"),
  lastName: z.string().trim().min(1, "الاسم الأخير مطلوب"),
  fatherName: z.string().trim().min(1, "اسم الأب مطلوب"),
  motherName: z.string().trim().optional(),
  gender: genderEnum,
  gradeLevelId: z.string().min(1, "الصفّ مطلوب"),
  address: z.string().trim().optional(),
  studentPhone: z.string().trim().optional(),
  parentPhone: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export const passwordSchema = z.object({
  password: z.string().min(6, "كلمة السر 6 أحرف على الأقل"),
});

export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;
