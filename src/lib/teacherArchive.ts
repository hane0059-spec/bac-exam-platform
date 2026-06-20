// src/lib/teacherArchive.ts
// تصنيف اختبارات المدرّس: أيُّها «مكتمل» (صُحِّح للجميع) فينتقل للأرشيف تلقائياً.
// مُشتقّ بالحساب — بلا حقل حالة، فيبقى دقيقاً ولا يحجب النتيجة عن الطلاب.
import { prisma } from "@/lib/prisma";

/**
 * يعيد مجموعة معرّفات الاختبارات «المكتملة» من بين المعطاة:
 * أُسنِدت لطالب واحد على الأقل، وأكمل كلُّ المُسنَد إليهم محاولةً،
 * ولا إجابة بانتظار مراجعة، ولا جلسة ورقية بانتظار تصحيح، ولا اعتراض مفتوح.
 */
export async function computeDoneQuizIds(
  quizIds: string[]
): Promise<Set<string>> {
  if (quizIds.length === 0) return new Set();

  const [assigns, sessions, pendingAns, openAppeals] = await Promise.all([
    prisma.quizAssignment.findMany({
      where: { quizId: { in: quizIds } },
      select: { quizId: true, studentId: true },
    }),
    prisma.examSession.findMany({
      where: { quizId: { in: quizIds } },
      select: { quizId: true, studentId: true, status: true, needsGrading: true },
    }),
    prisma.studentAnswer.findMany({
      where: { needsReview: true, session: { quizId: { in: quizIds } } },
      select: { session: { select: { quizId: true } } },
    }),
    prisma.gradeAppeal.findMany({
      where: { status: "OPEN", session: { quizId: { in: quizIds } } },
      select: { session: { select: { quizId: true } } },
    }),
  ]);

  // المُسنَد إليهم لكل اختبار.
  const assignedBy = new Map<string, Set<string>>();
  for (const a of assigns) {
    if (!a.studentId) continue;
    if (!assignedBy.has(a.quizId)) assignedBy.set(a.quizId, new Set());
    assignedBy.get(a.quizId)!.add(a.studentId);
  }
  // من أكمل محاولةً (لكل اختبار) + وجود تصحيح ورقي معلّق.
  const finishedBy = new Map<string, Set<string>>();
  const needsGradingQuiz = new Set<string>();
  for (const s of sessions) {
    if (s.status === "COMPLETED" || s.status === "TIMED_OUT") {
      if (!finishedBy.has(s.quizId)) finishedBy.set(s.quizId, new Set());
      finishedBy.get(s.quizId)!.add(s.studentId);
    }
    if (s.needsGrading) needsGradingQuiz.add(s.quizId);
  }
  const pendingQuiz = new Set(pendingAns.map((p) => p.session.quizId));
  const appealQuiz = new Set(openAppeals.map((a) => a.session.quizId));

  const done = new Set<string>();
  for (const quizId of quizIds) {
    const assigned = assignedBy.get(quizId);
    if (!assigned || assigned.size === 0) continue; // لا مُسنَد إليهم بعد
    const finished = finishedBy.get(quizId) ?? new Set<string>();
    const allDone = [...assigned].every((s) => finished.has(s));
    if (!allDone) continue;
    if (pendingQuiz.has(quizId)) continue; // إجابة بانتظار مراجعة
    if (needsGradingQuiz.has(quizId)) continue; // ورقة بانتظار تصحيح
    if (appealQuiz.has(quizId)) continue; // اعتراض مفتوح
    done.add(quizId);
  }
  return done;
}
