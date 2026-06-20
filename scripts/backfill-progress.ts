// scripts/backfill-progress.ts
// أداة لمرّة واحدة: تملأ StudentConceptPerformance من الجلسات المُنهاة السابقة
// (التي سبقت تفعيل التحليلات). تشغيل: npx tsx scripts/backfill-progress.ts
import { prisma } from "../src/lib/prisma";
import { aggregateConceptPerformance, type AnswerRow } from "../src/lib/analytics";

async function backfillStudent(studentId: string): Promise<number> {
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
      ? [{
          conceptId: a.question.conceptId,
          subjectId: a.question.subjectId,
          isCorrect: a.isCorrect,
          answeredAt: a.answeredAt,
        }]
      : []
  );
  const aggregates = aggregateConceptPerformance(rows);
  await prisma.$transaction([
    prisma.studentConceptPerformance.deleteMany({ where: { studentId } }),
    ...(aggregates.length > 0
      ? [prisma.studentConceptPerformance.createMany({
          data: aggregates.map((a) => ({ studentId, ...a })),
        })]
      : []),
  ]);
  return aggregates.length;
}

async function main() {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", examSessions: { some: { status: { in: ["COMPLETED", "TIMED_OUT"] } } } },
    select: { id: true, firstName: true, lastName: true },
  });
  for (const s of students) {
    const n = await backfillStudent(s.id);
    console.log(`${s.firstName} ${s.lastName}: ${n} درساً`);
  }
  console.log(`تمّ لـ ${students.length} طالباً.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
