// src/lib/parent.ts
// منطق ولي الأمر: التحقّق، أبناؤه، فحص الملكية، وحلّ رموز الطلاب ضمن المؤسّسة.
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { SessionData } from "@/lib/auth";

const genderEnum = z.enum(["MALE", "FEMALE"]);
const optionalEmail = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().trim().email("بريد إلكتروني غير صالح").optional(),
);

export const parentCreateSchema = z.object({
  firstName: z.string().trim().min(1, "الاسم الأول مطلوب"),
  lastName: z.string().trim().min(1, "الاسم الأخير مطلوب"),
  gender: genderEnum,
  email: optionalEmail,
  password: z.string().min(6, "كلمة السر 6 أحرف على الأقل"),
  studentCodes: z.array(z.string().trim().min(1)).default([]),
  schoolId: z.string().min(1).nullish(), // للمدير العام
});

// إضافة/إزالة روابط لاحقاً.
export const parentLinkSchema = z.object({
  studentCodes: z.array(z.string().trim().min(1)).default([]),
});

/** جلسة ولي أمر صالحة أو null. */
export async function getParentSession(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session || session.role !== "PARENT") return null;
  return session;
}

export interface ChildSummary {
  id: string;
  name: string;
  studentCode: string | null;
  gradeName: string | null;
  schoolName: string | null;
}

/** أبناء وليّ الأمر (الطلاب المرتبطون به). */
export async function getParentChildren(
  parentId: string,
): Promise<ChildSummary[]> {
  const links = await prisma.parentLink.findMany({
    where: { parentId },
    orderBy: { createdAt: "asc" },
    select: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          school: { select: { name: true } },
          studentProfile: {
            select: {
              studentCode: true,
              gradeLevel: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  return links.map((l) => ({
    id: l.student.id,
    name: `${l.student.firstName} ${l.student.lastName}`,
    studentCode: l.student.studentProfile?.studentCode ?? null,
    gradeName: l.student.studentProfile?.gradeLevel?.name ?? null,
    schoolName: l.student.school?.name ?? null,
  }));
}

/** هل وليّ الأمر مرتبط بهذا الطالب؟ (فحص ملكية — خصوصية القُصّر.) */
export async function parentOwnsStudent(
  parentId: string,
  studentId: string,
): Promise<boolean> {
  const link = await prisma.parentLink.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
    select: { id: true },
  });
  return !!link;
}

/**
 * يحلّ رموز طلاب إلى مُعرّفات ضمن مؤسّسة معطاة (أو كل المؤسّسات للمدير العام).
 * يُعيد المُعرّفات المطابقة والرموز غير المطابقة.
 */
export async function resolveStudentCodes(
  codes: string[],
  schoolId: string | null,
): Promise<{ ids: string[]; unknown: string[] }> {
  const cleaned = [...new Set(codes.map((c) => c.trim()).filter(Boolean))];
  if (cleaned.length === 0) return { ids: [], unknown: [] };

  const profiles = await prisma.studentProfile.findMany({
    where: {
      studentCode: { in: cleaned },
      // عزل المؤسّسة: مدير المدرسة يربط طلاب مؤسّسته فقط.
      ...(schoolId ? { user: { schoolId } } : {}),
    },
    select: { studentCode: true, userId: true },
  });
  const byCode = new Map(profiles.map((p) => [p.studentCode, p.userId]));
  const ids: string[] = [];
  const unknown: string[] = [];
  for (const c of cleaned) {
    const id = byCode.get(c);
    if (id) ids.push(id);
    else unknown.push(c);
  }
  return { ids, unknown };
}
