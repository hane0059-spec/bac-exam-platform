// src/lib/badges.test.ts
import { describe, it, expect } from "vitest";
import { computeBadges, type BadgeInputs } from "./badges";
import type { SubjectProgress } from "./studentProgress";

function subject(masteryScore: number, conceptScores: number[]): SubjectProgress {
  return {
    subjectId: `s-${masteryScore}-${conceptScores.join("-")}`,
    subjectName: "مادة",
    totalAttempts: 10,
    correctCount: Math.round(masteryScore / 10),
    masteryScore,
    concepts: conceptScores.map((m, i) => ({
      conceptId: `c${i}`,
      conceptName: "درس",
      totalAttempts: 5,
      correctCount: Math.round(m / 20),
      masteryScore: m,
      lastPracticed: null,
    })),
  };
}

const earned = (bs: ReturnType<typeof computeBadges>, id: string) =>
  bs.find((b) => b.id === id)!.earned;

describe("computeBadges — اشتقاق الشارات من بيانات الطالب", () => {
  it("طالب جديد بلا نشاط: كل الشارات مقفلة", () => {
    const input: BadgeInputs = {
      finishedCount: 0,
      bestPercentage: null,
      perfectCount: 0,
      subjects: [],
    };
    const bs = computeBadges(input);
    expect(bs.every((b) => !b.earned)).toBe(true);
    // الشارات ذات الهدف تبدأ من صفر.
    expect(bs.find((b) => b.id === "first_step")!.current).toBe(0);
  });

  it("شارات عدد الاختبارات تُحقَّق عند بلوغ العتبات", () => {
    const base: BadgeInputs = {
      finishedCount: 5,
      bestPercentage: 70,
      perfectCount: 0,
      subjects: [],
    };
    const bs = computeBadges(base);
    expect(earned(bs, "first_step")).toBe(true);
    expect(earned(bs, "persistent")).toBe(true);
    expect(earned(bs, "diligent")).toBe(false); // يحتاج 10
    expect(bs.find((b) => b.id === "diligent")!.current).toBe(5);
  });

  it("شارة العلامة الكاملة والتفوّق حسب النسب", () => {
    const bs = computeBadges({
      finishedCount: 3,
      bestPercentage: 100,
      perfectCount: 1,
      subjects: [],
    });
    expect(earned(bs, "high_score")).toBe(true); // ≥90
    expect(earned(bs, "perfect")).toBe(true); // 100٪
  });

  it("شارات الإتقان تَعُدّ الدروس والمواد المتقَنة (≥80٪)", () => {
    const bs = computeBadges({
      finishedCount: 8,
      bestPercentage: 88,
      perfectCount: 0,
      subjects: [
        subject(85, [90, 80, 60, 95, 82]), // مادة متقَنة + 4 دروس متقَنة
        subject(40, [88, 30]), // مادة غير متقَنة + درس متقَن واحد
      ],
    });
    // 5 دروس ≥80 إجمالاً.
    expect(earned(bs, "concept_master")).toBe(true);
    expect(earned(bs, "concept_master_5")).toBe(true);
    // مادة واحدة فقط ≥80.
    expect(earned(bs, "subject_master")).toBe(true);
  });

  it("درجة 89 لا تكفي لشارة التفوّق (حدّ صارم 90)", () => {
    const bs = computeBadges({
      finishedCount: 2,
      bestPercentage: 89,
      perfectCount: 0,
      subjects: [],
    });
    expect(earned(bs, "high_score")).toBe(false);
  });
});
