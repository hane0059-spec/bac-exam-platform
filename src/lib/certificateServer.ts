// src/lib/certificateServer.ts
// تحميل بيانات شهادة المدرّس لجلسة طالب مع الحراسة: الجلسة على اختبار يملكه المدرّس،
// ومنتهية ومعتمدة (لا تصحيح معلّق)، ونسبتها ≥ العتبة. بلا تغيير مخطط.
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import {
  certificateHonor,
  eligibleForTeacherCertificate,
  TEACHER_CERTIFICATE_THRESHOLD,
  type CertificateData,
} from "@/lib/certificate";

function formatDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export type TeacherCertificate =
  | { ok: false; reason: "notfound" }
  | { ok: false; reason: "ineligible"; message: string }
  | {
      ok: true;
      data: CertificateData;
      quizId: string;
      studentId: string;
      sessionId: string;
    };

export async function loadTeacherCertificate(
  sessionId: string,
  teacherId: string
): Promise<TeacherCertificate> {
  const exam = await prisma.examSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      percentage: true,
      needsGrading: true,
      completedAt: true,
      studentId: true,
      quizId: true,
      student: { select: { firstName: true, lastName: true, gender: true } },
      quiz: {
        select: {
          title: true,
          creatorId: true,
          subject: { select: { name: true } },
          creator: {
            select: { firstName: true, lastName: true, school: { select: { name: true } } },
          },
        },
      },
      answers: { where: { needsReview: true }, select: { id: true }, take: 1 },
    },
  });
  // الملكية: الاختبار للمدرّس نفسه.
  if (!exam || exam.quiz.creatorId !== teacherId) return { ok: false, reason: "notfound" };

  const pct = Number(exam.percentage);
  if (
    !eligibleForTeacherCertificate({
      status: exam.status,
      percentage: pct,
      needsGrading: exam.needsGrading,
      pendingReview: exam.answers.length > 0,
    })
  ) {
    return {
      ok: false,
      reason: "ineligible",
      message: `الشهادة تُصدَر لمن بلغت نسبته ${TEACHER_CERTIFICATE_THRESHOLD}% فأكثر بعد اعتماد تصحيحه — هذه الجلسة لا تستوفي ذلك (النسبة ${pct}%).`,
    };
  }

  const brand = await getBranding();
  return {
    ok: true,
    quizId: exam.quizId,
    studentId: exam.studentId,
    sessionId: exam.id,
    data: {
      studentName: `${exam.student.firstName} ${exam.student.lastName}`,
      female: exam.student.gender === "FEMALE",
      quizTitle: exam.quiz.title,
      subjectName: exam.quiz.subject.name,
      percentage: pct,
      honor: certificateHonor(pct) ?? "امتياز",
      dateStr: formatDay(exam.completedAt ?? new Date()),
      teacherName: `${exam.quiz.creator.firstName} ${exam.quiz.creator.lastName}`,
      schoolName: exam.quiz.creator.school?.name,
      brandName: brand.name,
    },
  };
}
