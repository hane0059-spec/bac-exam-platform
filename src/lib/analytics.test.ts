// src/lib/analytics.test.ts
import { describe, it, expect } from "vitest";
import { aggregateConceptPerformance, type AnswerRow } from "./analytics";

const d = (s: string) => new Date(s);

describe("aggregateConceptPerformance — تجميع أداء الطالب حسب الدرس", () => {
  it("يجمّع المحاولات والصحيحة ويحسب نسبة الإتقان لكل درس", () => {
    const rows: AnswerRow[] = [
      { conceptId: "c1", subjectId: "s1", isCorrect: true, answeredAt: d("2026-01-01") },
      { conceptId: "c1", subjectId: "s1", isCorrect: false, answeredAt: d("2026-01-02") },
      { conceptId: "c1", subjectId: "s1", isCorrect: true, answeredAt: d("2026-01-03") },
      { conceptId: "c2", subjectId: "s1", isCorrect: false, answeredAt: d("2026-01-01") },
    ];
    const out = aggregateConceptPerformance(rows);
    const c1 = out.find((a) => a.conceptId === "c1")!;
    const c2 = out.find((a) => a.conceptId === "c2")!;

    expect(c1.totalAttempts).toBe(3);
    expect(c1.correctCount).toBe(2);
    expect(c1.masteryScore).toBeCloseTo(66.67, 2);
    expect(c2.totalAttempts).toBe(1);
    expect(c2.correctCount).toBe(0);
    expect(c2.masteryScore).toBe(0);
  });

  it("يأخذ أحدث تاريخ ممارسة لكل درس", () => {
    const rows: AnswerRow[] = [
      { conceptId: "c1", subjectId: "s1", isCorrect: true, answeredAt: d("2026-03-10") },
      { conceptId: "c1", subjectId: "s1", isCorrect: true, answeredAt: d("2026-05-01") },
      { conceptId: "c1", subjectId: "s1", isCorrect: true, answeredAt: d("2026-04-15") },
    ];
    const [c1] = aggregateConceptPerformance(rows);
    expect(c1.lastPracticed).toEqual(d("2026-05-01"));
  });

  it("إتقان كامل عند كل الإجابات صحيحة", () => {
    const rows: AnswerRow[] = [
      { conceptId: "c1", subjectId: "s1", isCorrect: true, answeredAt: d("2026-01-01") },
      { conceptId: "c1", subjectId: "s1", isCorrect: true, answeredAt: d("2026-01-02") },
    ];
    expect(aggregateConceptPerformance(rows)[0].masteryScore).toBe(100);
  });

  it("قائمة فارغة → بلا نتائج", () => {
    expect(aggregateConceptPerformance([])).toEqual([]);
  });

  it("يفصل المواد المختلفة بصحّة", () => {
    const rows: AnswerRow[] = [
      { conceptId: "c1", subjectId: "bio", isCorrect: true, answeredAt: d("2026-01-01") },
      { conceptId: "c2", subjectId: "phys", isCorrect: false, answeredAt: d("2026-01-01") },
    ];
    const out = aggregateConceptPerformance(rows);
    expect(out.find((a) => a.conceptId === "c1")!.subjectId).toBe("bio");
    expect(out.find((a) => a.conceptId === "c2")!.subjectId).toBe("phys");
  });
});
