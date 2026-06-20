// src/lib/adminUsers.ts
// منطق إدارة المدير للمستخدمين: تحقّق وإنشاء رموز ووظائف مساعدة.
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const genderEnum = z.enum(["MALE", "FEMALE"]);
const optionalEmail = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().trim().email("بريد إلكتروني غير صالح").optional()
);

export const userCreateSchema = z.object({
  role: z.enum(["TEACHER", "ADMIN"]),
  firstName: z.string().trim().min(1, "الاسم الأول مطلوب"),
  lastName: z.string().trim().min(1, "الاسم الأخير مطلوب"),
  gender: genderEnum,
  email: optionalEmail,
  password: z.string().min(6, "كلمة السر 6 أحرف على الأقل"),
  qualification: z.string().trim().optional(),
  subjectIds: z.array(z.string().min(1)).default([]),
  canFileExams: z.boolean().default(false),
  canManageStudents: z.boolean().default(false),
  isSuperAdmin: z.boolean().default(false),
  schoolId: z.string().min(1).nullish(),
  // مدرّس مستقلّ + حدّ طلابه (للمدير العام فقط).
  isIndependent: z.boolean().default(false),
  studentLimit: z.number().int().min(1).max(100000).nullish(),
  // ملاحظات المُنشئ الخاصّة عن الحساب.
  creatorNotes: z.string().trim().max(5000).optional(),
});

export const userUpdateSchema = z.object({
  firstName: z.string().trim().min(1, "الاسم الأول مطلوب"),
  lastName: z.string().trim().min(1, "الاسم الأخير مطلوب"),
  gender: genderEnum,
  email: optionalEmail,
  isActive: z.boolean().default(true),
  qualification: z.string().trim().optional(),
  subjectIds: z.array(z.string().min(1)).default([]),
  canFileExams: z.boolean().default(false),
  canManageStudents: z.boolean().default(false),
  isSuperAdmin: z.boolean().default(false),
  // تعديل حدّ طلاب المدرّس المستقلّ (للمدير العام).
  studentLimit: z.number().int().min(1).max(100000).nullish(),
  // تعديل ملاحظات المُنشئ الخاصّة (للمُنشئ فقط).
  creatorNotes: z.string().trim().max(5000).optional(),
});

export const passwordSchema = z.object({
  password: z.string().min(6, "كلمة السر 6 أحرف على الأقل"),
});

/** رمز موظّف تسلسلي فريد للمدرّس (T-1002 ...). */
export async function nextEmployeeCode(): Promise<string> {
  const profiles = await prisma.teacherProfile.findMany({
    select: { employeeCode: true },
  });
  let max = 1000;
  for (const { employeeCode } of profiles) {
    const m = employeeCode.match(/(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `T-${max + 1}`;
}

/** السنة الدراسية الحالية بصيغة "YYYY-YYYY". */
export function currentAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const start = now.getMonth() >= 7 ? y : y - 1; // من آب يبدأ عام جديد
  return `${start}-${start + 1}`;
}
