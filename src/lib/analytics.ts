// src/lib/analytics.ts
// منطق تحليلات تقدّم الطالب — دالة نقيّة قابلة للاختبار (بلا قاعدة بيانات):
// تجميع أداء الطالب حسب الدرس (Concept) من صفوف إجاباته.
// كود قاعدة البيانات (التحديث/القراءة) في studentProgress.ts.

export interface AnswerRow {
  conceptId: string;
  subjectId: string;
  isCorrect: boolean;
  answeredAt: Date;
}

export interface ConceptAggregate {
  conceptId: string;
  subjectId: string;
  totalAttempts: number;
  correctCount: number;
  masteryScore: number; // 0..100، نسبة الإجابات الصحيحة
  lastPracticed: Date;
}

/**
 * يجمّع صفوف الإجابات حسب الدرس: المحاولات = عدد الإجابات، الصحيحة = عددها،
 * الإتقان = (صحيحة/محاولات)×100، وآخر ممارسة = أحدث تاريخ إجابة في الدرس.
 */
export function aggregateConceptPerformance(
  rows: AnswerRow[]
): ConceptAggregate[] {
  const byConcept = new Map<string, ConceptAggregate>();
  for (const r of rows) {
    let agg = byConcept.get(r.conceptId);
    if (!agg) {
      agg = {
        conceptId: r.conceptId,
        subjectId: r.subjectId,
        totalAttempts: 0,
        correctCount: 0,
        masteryScore: 0,
        lastPracticed: r.answeredAt,
      };
      byConcept.set(r.conceptId, agg);
    }
    agg.totalAttempts += 1;
    if (r.isCorrect) agg.correctCount += 1;
    if (r.answeredAt > agg.lastPracticed) agg.lastPracticed = r.answeredAt;
  }
  for (const agg of byConcept.values()) {
    agg.masteryScore = masteryPercent(agg.correctCount, agg.totalAttempts);
  }
  return [...byConcept.values()];
}

/** نسبة الإتقان (0..100) بمنزلتين عشريّتين. */
export function masteryPercent(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 10000) / 100;
}
