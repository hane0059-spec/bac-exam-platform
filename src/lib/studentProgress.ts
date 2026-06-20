// src/lib/studentProgress.ts
// قراءة/تحديث تقدّم الطالب في قاعدة البيانات (StudentConceptPerformance).
// يعيد الاشتقاق بالكامل من الإجابات (idempotent) فيبقى دقيقاً مع إعادة الحساب.
import { prisma } from "@/lib/prisma";
import {
  aggregateConceptPerformance,
  masteryPercent,
  type AnswerRow,
} from "@/lib/analytics";

/**
 * يعيد اشتقاق أداء الطالب من كل إجاباته في الجلسات المُنهاة (استبعاد الأسئلة
 * المُلغاة وبلا درس)، ويستبدل صفوفه في StudentConceptPerformance بالكامل.
 * Best-effort: يُستدعى من مسار التصحيح، وفشله لا يكسر التسليم.
 */
export async function updateStudentConceptPerformance(
  studentId: string
): Promise<void> {
  const answers = await prisma.studentAnswer.findMany({
    where: {
      session: { studentId, status: { in: ["COMPLETED", "TIMED_OUT"] } },
      question: { conceptId: { not: null }, isCancelled: false },
    },
    select: {
      isCorrect: true,
      answeredAt: true,
      question: { select: { conceptId: true, subjectId: true } },
    },
  });

  const rows: AnswerRow[] = answers.flatMap((a) =>
    a.question.conceptId
      ? [
          {
            conceptId: a.question.conceptId,
            subjectId: a.question.subjectId,
            isCorrect: a.isCorrect,
            answeredAt: a.answeredAt,
          },
        ]
      : []
  );

  const aggregates = aggregateConceptPerformance(rows);

  // استبدال كامل (idempotent) ضمن معاملة واحدة.
  await prisma.$transaction([
    prisma.studentConceptPerformance.deleteMany({ where: { studentId } }),
    ...(aggregates.length > 0
      ? [
          prisma.studentConceptPerformance.createMany({
            data: aggregates.map((a) => ({
              studentId,
              conceptId: a.conceptId,
              subjectId: a.subjectId,
              totalAttempts: a.totalAttempts,
              correctCount: a.correctCount,
              masteryScore: a.masteryScore,
              lastPracticed: a.lastPracticed,
            })),
          }),
        ]
      : []),
  ]);
}

export interface ConceptProgress {
  conceptId: string;
  conceptName: string;
  totalAttempts: number;
  correctCount: number;
  masteryScore: number;
  lastPracticed: Date | null;
}
export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  totalAttempts: number;
  correctCount: number;
  masteryScore: number; // متوسّط مرجَّح بعدد المحاولات
  concepts: ConceptProgress[];
}

/** يقرأ تقدّم الطالب مجمّعاً حسب المادة ثم الدرس (الأضعف أوّلاً للعرض). */
export async function getStudentProgress(
  studentId: string
): Promise<SubjectProgress[]> {
  const rows = await prisma.studentConceptPerformance.findMany({
    where: { studentId },
    include: { concept: { select: { title: true } } },
    orderBy: { masteryScore: "asc" },
  });

  // أسماء المواد (subjectId مخزَّن على صفّ الأداء مباشرةً).
  const subjectIds = [...new Set(rows.map((r) => r.subjectId))];
  const subjectRows = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, name: true },
  });
  const subjectName = new Map(subjectRows.map((s) => [s.id, s.name]));

  const bySubject = new Map<string, SubjectProgress>();
  for (const r of rows) {
    const subjId = r.subjectId;
    let subj = bySubject.get(subjId);
    if (!subj) {
      subj = {
        subjectId: subjId,
        subjectName: subjectName.get(subjId) ?? "—",
        totalAttempts: 0,
        correctCount: 0,
        masteryScore: 0,
        concepts: [],
      };
      bySubject.set(subjId, subj);
    }
    subj.totalAttempts += r.totalAttempts;
    subj.correctCount += r.correctCount;
    subj.concepts.push({
      conceptId: r.conceptId,
      conceptName: r.concept.title,
      totalAttempts: r.totalAttempts,
      correctCount: r.correctCount,
      masteryScore: Number(r.masteryScore),
      lastPracticed: r.lastPracticed,
    });
  }
  for (const subj of bySubject.values()) {
    subj.masteryScore = masteryPercent(subj.correctCount, subj.totalAttempts);
  }
  return [...bySubject.values()].sort((a, b) => a.masteryScore - b.masteryScore);
}
