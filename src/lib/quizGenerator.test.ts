import { describe, it, expect } from "vitest";
import { distributeScore, generateRequestSchema } from "./quizGenerator";

function sum(map: Map<string, number>): number {
  return Math.round([...map.values()].reduce((a, b) => a + b, 0) * 100) / 100;
}

describe("distributeScore", () => {
  it("يجعل المجموع مطابقاً تماماً للهدف حتى مع كسور غريبة", () => {
    const selected = [
      { id: "a", points: 1 },
      { id: "b", points: 2 },
      { id: "c", points: 3 },
    ];
    const map = distributeScore(selected, 100);
    expect(sum(map)).toBe(100);
  });

  it("يحافظ على النسبة التناسبية بين الأسئلة", () => {
    const selected = [
      { id: "a", points: 1 },
      { id: "b", points: 3 },
    ];
    const map = distributeScore(selected, 40);
    // النسبة الأصلية 1:3 يجب أن تبقى تقريباً بعد التوزيع.
    const a = map.get("a")!;
    const b = map.get("b")!;
    expect(b / a).toBeGreaterThan(2.5);
    expect(b / a).toBeLessThan(3.5);
  });

  it("لا يُعطي أيّ سؤال درجة أقل من 0.25", () => {
    const selected = Array.from({ length: 40 }, (_, i) => ({ id: String(i), points: 1 }));
    const map = distributeScore(selected, 10); // 40 سؤالاً بدرجة 0.25 لكلٍّ منها تقريباً
    for (const v of map.values()) expect(v).toBeGreaterThanOrEqual(0.25);
    expect(sum(map)).toBe(10);
  });

  it("مجموعة فارغة لا تكسر الدالة", () => {
    const map = distributeScore([], 100);
    expect(map.size).toBe(0);
  });

  it("يُطابق المجموع مع أعداد أسئلة كبيرة ودرجات متفاوتة", () => {
    const selected = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      points: 1 + (i % 5),
    }));
    const map = distributeScore(selected, 100);
    expect(sum(map)).toBe(100);
  });
});

describe("generateRequestSchema", () => {
  it("يرفض طلباً بلا أي نوع سؤال بعدد أكبر من صفر", () => {
    const r = generateRequestSchema.safeParse({
      subjectId: "s1",
      scope: null,
      title: "اختبار",
      targetTotal: 100,
      modelsCount: 1,
      requirements: [{ type: "MULTIPLE_CHOICE", count: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it("يقبل طلباً صالحاً بنطاق فصل", () => {
    const r = generateRequestSchema.safeParse({
      subjectId: "s1",
      scope: { chapterId: "c1" },
      title: "اختبار الوحدة الأولى",
      targetTotal: 100,
      modelsCount: 3,
      requirements: [
        { type: "MULTIPLE_CHOICE", count: 5 },
        { type: "ESSAY", count: 2 },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("يرفض أكثر من 7 نماذج", () => {
    const r = generateRequestSchema.safeParse({
      subjectId: "s1",
      scope: null,
      title: "اختبار",
      targetTotal: 100,
      modelsCount: 8,
      requirements: [{ type: "MULTIPLE_CHOICE", count: 5 }],
    });
    expect(r.success).toBe(false);
  });
});
