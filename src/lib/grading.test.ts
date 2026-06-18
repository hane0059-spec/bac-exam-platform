// src/lib/grading.test.ts
// اختبارات الدوال الأخطر: التطبيع/التصحيح وإعادة حساب الدرجة.
import { describe, it, expect } from "vitest";
import {
  normalizeArabic,
  gradeOptionAnswer,
  gradeShortAnswer,
  computeScore,
} from "./grading";

describe("normalizeArabic", () => {
  it("يزيل التشكيل", () => {
    expect(normalizeArabic("نَوَاةٌ")).toBe(normalizeArabic("نواه"));
    expect(normalizeArabic("مُحَمَّد")).toBe("محمد");
  });

  it("يوحّد الهمزات والألف", () => {
    expect(normalizeArabic("أحمد")).toBe("احمد");
    expect(normalizeArabic("إيمان")).toBe("ايمان");
    expect(normalizeArabic("آدم")).toBe("ادم");
  });

  it("يوحّد التاء المربوطة والألف المقصورة", () => {
    expect(normalizeArabic("خلية")).toBe(normalizeArabic("خليه"));
    expect(normalizeArabic("مستوى")).toBe(normalizeArabic("مستوي"));
  });

  it("يوحّد الهمزة على الواو والياء", () => {
    expect(normalizeArabic("مسؤول")).toBe(normalizeArabic("مسوول"));
    expect(normalizeArabic("مسائل")).toBe(normalizeArabic("مسايل"));
  });

  it("يزيل التطويل ويضغط المسافات", () => {
    expect(normalizeArabic("الـــكبد")).toBe("الكبد");
    expect(normalizeArabic("  الكبد   الدهني ")).toBe("الكبد الدهني");
  });

  it("يوحّد الأرقام العربية إلى لاتينية", () => {
    expect(normalizeArabic("١٢٣")).toBe("123");
    expect(normalizeArabic("الرقم ٤٥")).toBe("الرقم 45");
  });

  it("يصغّر الأحرف اللاتينية", () => {
    expect(normalizeArabic("ADH")).toBe("adh");
  });

  it("يعيد فراغاً للنصّ الفارغ", () => {
    expect(normalizeArabic("")).toBe("");
    expect(normalizeArabic("   ")).toBe("");
  });
});

describe("gradeShortAnswer — مطابقة دقيقة لا جزئية", () => {
  it("يقبل المطابقة بعد التطبيع رغم اختلاف التشكيل/الهمزة", () => {
    expect(gradeShortAnswer(["النواة"], "النَّواةُ")).toBe(true);
    expect(gradeShortAnswer(["الأنسولين"], "الانسولين")).toBe(true);
  });

  it("يقبل أيّ إجابة من قائمة الإجابات المقبولة", () => {
    expect(gradeShortAnswer(["الكبد", "الكَبِد"], "كبد")).toBe(false);
    expect(gradeShortAnswer(["الكبد", "كبد"], "كبد")).toBe(true);
  });

  it("يرفض المطابقة الجزئية", () => {
    expect(gradeShortAnswer(["النواة"], "نواة")).toBe(false);
    expect(gradeShortAnswer(["نواة الخلية"], "نواة")).toBe(false);
  });

  it("يرفض الإجابة الفارغة", () => {
    expect(gradeShortAnswer(["الكبد"], "")).toBe(false);
    expect(gradeShortAnswer(["الكبد"], null)).toBe(false);
    expect(gradeShortAnswer(["الكبد"], "   ")).toBe(false);
  });
});

describe("gradeOptionAnswer — مطابقة المجموعة تماماً", () => {
  it("اختيار مفرد صحيح", () => {
    expect(gradeOptionAnswer(["a"], ["a"])).toBe(true);
    expect(gradeOptionAnswer(["a"], ["b"])).toBe(false);
  });

  it("متعدد الصواب: لا يقبل الناقص ولا الزائد", () => {
    expect(gradeOptionAnswer(["a", "b"], ["a", "b"])).toBe(true);
    expect(gradeOptionAnswer(["a", "b"], ["b", "a"])).toBe(true);
    expect(gradeOptionAnswer(["a", "b"], ["a"])).toBe(false);
    expect(gradeOptionAnswer(["a", "b"], ["a", "b", "c"])).toBe(false);
  });

  it("يرفض غياب الإجابة أو غياب المفتاح", () => {
    expect(gradeOptionAnswer(["a"], [])).toBe(false);
    expect(gradeOptionAnswer([], ["a"])).toBe(false);
  });
});

describe("computeScore — نسبة من الأسئلة الصالحة", () => {
  it("يحسب النسبة من الأسئلة الصالحة", () => {
    const r = computeScore([
      { points: 1, isCorrect: true },
      { points: 1, isCorrect: false },
      { points: 2, isCorrect: true },
    ]);
    expect(r.earned).toBe(3);
    expect(r.max).toBe(4);
    expect(r.percentage).toBe(75);
  });

  it("يستبعد السؤال المُلغى من البسط والمقام", () => {
    const r = computeScore([
      { points: 1, isCorrect: true },
      { points: 1, isCorrect: false, isCancelled: true }, // مُلغى
      { points: 1, isCorrect: true },
    ]);
    expect(r.max).toBe(2);
    expect(r.earned).toBe(2);
    expect(r.percentage).toBe(100);
  });

  it("النسبة 0 عند انعدام الأسئلة الصالحة", () => {
    const r = computeScore([{ points: 1, isCorrect: true, isCancelled: true }]);
    expect(r).toEqual({ earned: 0, max: 0, percentage: 0 });
    expect(computeScore([])).toEqual({ earned: 0, max: 0, percentage: 0 });
  });

  it("يقرّب النسبة إلى منزلتين عشريتين", () => {
    const r = computeScore([
      { points: 1, isCorrect: true },
      { points: 1, isCorrect: true },
      { points: 1, isCorrect: false },
    ]);
    expect(r.percentage).toBe(66.67);
  });

  it("يدعم الدرجة الجزئية عبر earned (مقالي 4 من 5)", () => {
    const r = computeScore([
      { points: 2, isCorrect: true, earned: 2 }, // قصير صحيح كامل
      { points: 5, isCorrect: true, earned: 4 }, // مقالي جزئي 4/5
    ]);
    expect(r.earned).toBe(6);
    expect(r.max).toBe(7);
    expect(r.percentage).toBe(85.71);
  });

  it("يحصر earned ضمن [0, points]", () => {
    const r = computeScore([
      { points: 5, isCorrect: true, earned: 9 }, // يتجاوز → يُحصَر بـ5
      { points: 3, isCorrect: false, earned: -2 }, // سالب → 0
    ]);
    expect(r.earned).toBe(5);
    expect(r.max).toBe(8);
  });

  it("يبقى ثنائياً عند غياب earned (توافق رجعي)", () => {
    const r = computeScore([
      { points: 4, isCorrect: true },
      { points: 4, isCorrect: false },
    ]);
    expect(r.earned).toBe(4);
  });
});
