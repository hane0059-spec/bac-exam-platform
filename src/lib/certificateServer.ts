// src/lib/certificateServer.ts
// تحميل بيانات شهادة المدرّس لجلسة طالب مع الحراسة: الجلسة على اختبار يملكه المدرّس،
// ومنتهية ومعتمدة (لا تصحيح معلّق)، ونسبتها ≥ العتبة. بلا تغيير مخطط.
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import {
  certificateHonor,
  eligibleForTeacherCertificate,
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
          creator: { select: { firstName: true, lastName: true } },
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
      message: "لا تُصدَر الشهادة قبل انتهاء الطالب من الاختبار واعتماد تصحيحه (لا إجابة بانتظار المراجعة).",
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
      honor: certificateHonor(pct) ?? "مشارك",
      dateStr: formatDay(exam.completedAt ?? new Date()),
      teacherName: `${exam.quiz.creator.firstName} ${exam.quiz.creator.lastName}`,
      brandName: brand.name,
    },
  };
}

export type QuizCertificates =
  | { ok: false }
  | {
      ok: true;
      quizTitle: string;
      items: { sessionId: string; studentId: string; data: CertificateData }[];
    };

/**
 * شهادات كل طلاب اختبار يملكه المدرّس: أفضل جلسة معتمدة (منتهية بلا تصحيح معلّق) لكل طالب،
 * مرتّبة بالنسبة تنازلياً. بلا تغيير مخطط.
 */
export async function loadQuizCertificates(
  quizId: string,
  teacherId: string
): Promise<QuizCertificates> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      title: true,
      creatorId: true,
      subject: { select: { name: true } },
      creator: { select: { firstName: true, lastName: true } },
    },
  });
  // الملكية: الاختبار للمدرّس نفسه.
  if (!quiz || quiz.creatorId !== teacherId) return { ok: false };

  const sessions = await prisma.examSession.findMany({
    where: { quizId, status: { in: ["COMPLETED", "TIMED_OUT"] }, needsGrading: false },
    select: {
      id: true,
      studentId: true,
      percentage: true,
      completedAt: true,
      student: { select: { firstName: true, lastName: true, gender: true } },
      answers: { where: { needsReview: true }, select: { id: true }, take: 1 },
    },
  });
  const best = new Map<string, (typeof sessions)[number]>();
  for (const s of sessions) {
    if (s.answers.length > 0) continue;
    const cur = best.get(s.studentId);
    if (!cur || Number(s.percentage) > Number(cur.percentage)) best.set(s.studentId, s);
  }
  const brand = await getBranding();
  const teacherName = `${quiz.creator.firstName} ${quiz.creator.lastName}`;
  const items = [...best.values()]
    .map((s) => {
      const pct = Number(s.percentage);
      return {
        sessionId: s.id,
        studentId: s.studentId,
        data: {
          studentName: `${s.student.firstName} ${s.student.lastName}`,
          female: s.student.gender === "FEMALE",
          quizTitle: quiz.title,
          subjectName: quiz.subject.name,
          percentage: pct,
          honor: certificateHonor(pct) ?? "مشارك",
          dateStr: formatDay(s.completedAt ?? new Date()),
          teacherName,
          brandName: brand.name,
        } satisfies CertificateData,
      };
    })
    .sort(
      (a, b) =>
        b.data.percentage - a.data.percentage ||
        a.data.studentName.localeCompare(b.data.studentName, "ar")
    );
  return { ok: true, quizTitle: quiz.title, items };
}
