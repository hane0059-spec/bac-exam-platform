// src/lib/enrichment.ts
// «أسئلة وإثراء» الخاصّة بالمدرّس: المحتوى (EnrichmentFile.teacherId != null) لا يراه
// إلا طلابه المسجّلون عنده تسجيلاً فعّالاً، ما دام المدير العام مفعِّلاً الخاصّية له.
import { prisma } from "@/lib/prisma";

/** المدرّسون الذين للطالب تسجيل فعّال عندهم وفعّل المدير لهم «الإثراء» (مع حساب فعّال). */
export async function enrichmentTeacherIdsForStudent(
  studentId: string,
): Promise<string[]> {
  const rows = await prisma.studentEnrollment.findMany({
    where: {
      studentId,
      isActive: true,
      teacher: {
        isActive: true,
        teacherProfile: { canEnrichment: true },
      },
    },
    select: { teacherId: true },
  });
  return [...new Set(rows.map((r) => r.teacherId))];
}

/** هل يحقّ لهذا الطالب رؤية إثراء هذا المدرّس؟ */
export async function studentCanSeeTeacherEnrichment(
  studentId: string,
  teacherId: string,
): Promise<boolean> {
  const n = await prisma.studentEnrollment.count({
    where: {
      studentId,
      teacherId,
      isActive: true,
      teacher: { isActive: true, teacherProfile: { canEnrichment: true } },
    },
  });
  return n > 0;
}

/** أقصى عدد عناصر إثراء لكل مدرّس (حماية للتخزين). */
export const MAX_TEACHER_ENRICHMENT_ITEMS = 100;

/** الصفوف التي يدرّس فيها المدرّس (من موادّه) — الخيارات المتاحة له للنشر. */
export async function teacherGradeLevels(teacherId: string) {
  const subjects = await prisma.subject.findMany({
    where: { teacherSubjects: { some: { teacherId } } },
    select: { gradeLevel: { select: { id: true, name: true, orderNum: true } } },
  });
  const map = new Map<string, { id: string; name: string; orderNum: number }>();
  for (const s of subjects) map.set(s.gradeLevel.id, s.gradeLevel);
  return [...map.values()].sort((a, b) => a.orderNum - b.orderNum);
}
