// src/lib/questionImport.test.ts
import { describe, it, expect } from "vitest";
import { normalizeBankJson } from "./questionImport";

const find = (r: ReturnType<typeof normalizeBankJson>, id: string) =>
  r.items.find((i) => i.sourceId === id);

describe("normalizeBankJson — تطبيع ملفّات بنك الأسئلة", () => {
  it("multiple_choice → MULTIPLE_CHOICE بإجابة صحيحة واحدة", () => {
    const r = normalizeBankJson({
      metadata: { subject: "علم الأحياء" },
      questions: [
        {
          id: "Q1",
          type: "multiple_choice",
          level: "easy",
          text: "سؤال؟",
          options: [
            { key: "A", text: "أ" },
            { key: "B", text: "ب" },
            { key: "C", text: "ج" },
            { key: "D", text: "د" },
          ],
          answer: "C",
          explanation: "لأنّ ج صحيح",
        },
      ],
    });
    expect(r.subjectName).toBe("علم الأحياء");
    const q = find(r, "Q1")!;
    expect(q.type).toBe("MULTIPLE_CHOICE");
    expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
    expect(q.options.find((o) => o.isCorrect)!.content).toBe("ج");
    expect(q.difficulty).toBe("EASY");
    expect(q.explanation).toBe("لأنّ ج صحيح");
  });

  it("MCQ_GRAPH → يُدرَج وصف الشكل في نصّ السؤال مع تنبيه", () => {
    const r = normalizeBankJson({
      questions: [
        {
          id: "G1",
          type: "MCQ_GRAPH",
          level: "hard",
          graph_description: "منحنى كمون العمل",
          stem: "لاحظ الشكل؟",
          options: [
            { key: "A", text: "أ" },
            { key: "B", text: "ب" },
          ],
          answer: "A",
        },
      ],
    });
    const q = find(r, "G1")!;
    expect(q.type).toBe("MULTIPLE_CHOICE");
    expect(q.content).toContain("وصف الشكل: منحنى كمون العمل");
    expect(q.warnings.some((w) => w.includes("وصف الشكل"))).toBe(true);
  });

  it("إجابة اختيار لا تطابق أيّ خيار → خطأ مُجمَّع لا استثناء", () => {
    const r = normalizeBankJson({
      questions: [
        {
          id: "Bad",
          type: "multiple_choice",
          text: "س؟",
          options: [{ key: "A", text: "أ" }, { key: "B", text: "ب" }],
          answer: "Z",
        },
      ],
    });
    expect(r.items).toHaveLength(0);
    expect(r.errors[0].sourceId).toBe("Bad");
  });

  it("true_false (options+key) و TF (نصّ) → TRUE_FALSE", () => {
    const r = normalizeBankJson({
      questions: [
        {
          id: "TFa",
          type: "true_false",
          text: "عبارة",
          options: [{ key: "A", text: "صحيح" }, { key: "B", text: "خطأ" }],
          answer: "B",
        },
        {
          id: "TFb",
          type: "TF",
          stem: "عبارة أخرى",
          answer: "صحيح",
          correction: "لا تصحيح",
        },
      ],
    });
    const a = find(r, "TFa")!;
    expect(a.type).toBe("TRUE_FALSE");
    expect(a.options.find((o) => o.content === "خطأ")!.isCorrect).toBe(true);
    const b = find(r, "TFb")!;
    expect(b.options.find((o) => o.content === "صح")!.isCorrect).toBe(true);
    expect(b.explanation).toBe("لا تصحيح");
  });

  it("ORDER → عناصر بالترتيب الصحيح المُعاد بناؤه", () => {
    const r = normalizeBankJson({
      questions: [
        {
          id: "O1",
          type: "ORDER",
          stem: "رتّب",
          shuffled_steps: ["ب", "ج", "أ"],
          correct_order: [3, 1, 2],
        },
      ],
    });
    const q = find(r, "O1")!;
    expect(q.type).toBe("ORDER");
    expect(q.options.map((o) => o.content)).toEqual(["أ", "ب", "ج"]);
  });

  it("MATCH → أزواج أيسر↔أيمن بعد إزالة البادئات", () => {
    const r = normalizeBankJson({
      questions: [
        {
          id: "M1",
          type: "MATCH",
          stem: "طابق",
          column_A: ["1- HCG", "2- الريلاكسين"],
          column_B: ["أ- وظيفة-أ", "ب- وظيفة-ب"],
          answer_key: { "1": "ب", "2": "أ" },
        },
      ],
    });
    const q = find(r, "M1")!;
    expect(q.type).toBe("MATCHING");
    expect(q.matchingPairs).toEqual([
      { left: "HCG", right: "وظيفة-ب" },
      { left: "الريلاكسين", right: "وظيفة-أ" },
    ]);
  });

  it("CONCEPT_MAP → FILL_BLANK بعلامات [[ ]] وإجاباتٍ بترتيب الظهور", () => {
    const r = normalizeBankJson({
      questions: [
        {
          id: "CM1",
          type: "CONCEPT_MAP",
          stem: "أكمل",
          structure: "الجذر ← [1: س] و[2: ع]",
          empty_nodes: { "1": "سين", "2": "عين" },
        },
      ],
    });
    const q = find(r, "CM1")!;
    expect(q.type).toBe("FILL_BLANK");
    expect((q.content.match(/\[\[ \]\]/g) ?? []).length).toBe(2);
    expect(q.options.map((o) => o.content)).toEqual(["سين", "عين"]);
  });

  it("الأنواع المقالية (EXPLAIN/COMPARE/GENETICS/CRITICAL/LABEL) → ESSAY بنموذج إجابة", () => {
    const r = normalizeBankJson({
      questions: [
        {
          id: "E1",
          type: "EXPLAIN",
          phenomenon: "ظاهرة",
          scoring_rubric: [{ point: "نقطة أولى", marks: 3 }],
        },
        {
          id: "C1",
          type: "COMPARE",
          topic_A: "أ",
          topic_B: "ب",
          comparison_aspects: ["السرعة"],
          answer_table: { السرعة: ["بطيء", "سريع"] },
        },
        {
          id: "L1",
          type: "LABEL",
          stem: "سمِّ",
          numbered_parts: ["1", "2"],
          correct_labels: { "1": "اسم١", "2": "اسم٢" },
        },
      ],
    });
    const e = find(r, "E1")!;
    expect(e.type).toBe("ESSAY");
    expect(e.content).toContain("علّل الظاهرة الآتية: ظاهرة");
    expect(e.explanation).toContain("نقطة أولى");
    expect(e.warnings.some((w) => w.includes("يدوي"))).toBe(true);
    const c = find(r, "C1")!;
    expect(c.content).toContain("قارن بين");
    expect(c.explanation).toContain("بطيء");
    const l = find(r, "L1")!;
    expect(l.explanation).toContain("اسم١");
  });

  it("ملفّ بلا مصفوفة questions يرمي خطأً واضحاً", () => {
    expect(() => normalizeBankJson({ metadata: {} })).toThrow();
  });
});
