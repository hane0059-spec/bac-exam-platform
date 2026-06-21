// src/lib/mathEval.test.ts
import { describe, it, expect } from "vitest";
import {
  evaluateLatexNumber,
  gradeCalculationLatex,
  gradeMathShortAnswer,
  latexEquivalent,
  stripMathDelimiters,
} from "@/lib/mathEval";

describe("evaluateLatexNumber — تقييم رقم/LaTeX إلى عدد", () => {
  it("أرقام عادية وعربية", () => {
    expect(evaluateLatexNumber("6")).toBe(6);
    expect(evaluateLatexNumber("3.5")).toBe(3.5);
    expect(evaluateLatexNumber("٦")).toBe(6); // أرقام عربية عبر parseNumber
  });
  it("تعابير LaTeX", () => {
    expect(evaluateLatexNumber("\\frac{1}{2}")).toBeCloseTo(0.5, 6);
    expect(evaluateLatexNumber("\\sqrt{9}")).toBeCloseTo(3, 6);
    expect(evaluateLatexNumber("2^3")).toBeCloseTo(8, 6);
    expect(evaluateLatexNumber("5 \\times 10^{3}")).toBeCloseTo(5000, 6);
  });
  it("يزيل غلاف $…$", () => {
    expect(evaluateLatexNumber("$\\frac{3}{4}$")).toBeCloseTo(0.75, 6);
    expect(evaluateLatexNumber("$6$")).toBe(6);
  });
  it("غير قابل للتقييم → null", () => {
    expect(evaluateLatexNumber("")).toBeNull();
    expect(evaluateLatexNumber(null)).toBeNull();
    expect(evaluateLatexNumber("\\text{نيوتن}")).toBeNull();
  });
});

describe("gradeCalculationLatex — تصحيح الحساب بدعم LaTeX", () => {
  it("مطابقة تامّة (بلا هامش)", () => {
    expect(gradeCalculationLatex(["6", "0"], "$6$")).toBe(true);
    expect(gradeCalculationLatex(["6", "0"], "$\\frac{12}{2}$")).toBe(true);
    expect(gradeCalculationLatex(["6", "0"], "7")).toBe(false);
  });
  it("ضمن هامش الخطأ", () => {
    expect(gradeCalculationLatex(["3.14", "0.01"], "3.15")).toBe(true);
    expect(gradeCalculationLatex(["3.14", "0.01"], "3.2")).toBe(false);
  });
  it("كسر مقبول = 0.5", () => {
    expect(gradeCalculationLatex(["0.5", "0"], "$\\frac{1}{2}$")).toBe(true);
  });
  it("إجابة فارغة/غير صالحة → خطأ", () => {
    expect(gradeCalculationLatex(["6", "0"], "")).toBe(false);
    expect(gradeCalculationLatex(["6", "0"], null)).toBe(false);
  });
});

describe("latexEquivalent — تكافؤ رياضيّ", () => {
  it("تكافؤ رمزيّ", () => {
    expect(latexEquivalent("$2x$", "$x \\cdot 2$")).toBe(true);
    expect(latexEquivalent("x^2", "x \\cdot x")).toBe(true);
  });
  it("تكافؤ عدديّ", () => {
    expect(latexEquivalent("\\frac{1}{2}", "0.5")).toBe(true);
  });
  it("غير متكافئ", () => {
    expect(latexEquivalent("2x", "3x")).toBe(false);
    expect(latexEquivalent("x+1", "x-1")).toBe(false);
  });
  it("فارغ → خطأ", () => {
    expect(latexEquivalent("", "x")).toBe(false);
    expect(latexEquivalent(null, "x")).toBe(false);
  });
});

describe("gradeMathShortAnswer — إجابة قصيرة رياضية بالتكافؤ", () => {
  it("يقبل صيغةً مكافئة لأيّ إجابة مقبولة", () => {
    expect(gradeMathShortAnswer(["2x"], "$x \\cdot 2$")).toBe(true);
    expect(gradeMathShortAnswer(["\\frac{1}{2}", "0.5"], "0.5")).toBe(true);
  });
  it("يرفض غير المكافئ", () => {
    expect(gradeMathShortAnswer(["2x"], "3x")).toBe(false);
  });
  it("إجابة فارغة → خطأ", () => {
    expect(gradeMathShortAnswer(["2x"], "")).toBe(false);
    expect(gradeMathShortAnswer(["2x"], null)).toBe(false);
  });
});

describe("stripMathDelimiters", () => {
  it("يزيل $ و $$", () => {
    expect(stripMathDelimiters("$x$")).toBe("x");
    expect(stripMathDelimiters("$$x$$")).toBe("x");
    expect(stripMathDelimiters("x")).toBe("x");
  });
});
