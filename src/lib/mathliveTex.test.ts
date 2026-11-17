import { describe, it, expect } from "vitest";
import katex from "katex";
import {
  normalizeMathliveTex,
  mathliveMacros,
  hasEmptyPlaceholder,
  emptyPlaceholderPaths,
} from "./mathliveTex";

describe("كشف الخانة الفارغة (مربّع أزرق لم يُملأ)", () => {
  it("يكشف الفارغة بأشكالها ولا يكشف المملوءة", () => {
    expect(hasEmptyPlaceholder("\\int_0^1\\placeholder{}\\,dx")).toBe(true);
    expect(hasEmptyPlaceholder("\\placeholder")).toBe(true);
    expect(hasEmptyPlaceholder("\\placeholder[x]{}")).toBe(true);
    expect(hasEmptyPlaceholder("\\placeholder[x]{  }")).toBe(true);
    expect(hasEmptyPlaceholder("\\placeholder{6}")).toBe(false);
    expect(hasEmptyPlaceholder("x^2+1")).toBe(false);
    expect(hasEmptyPlaceholder("")).toBe(false);
  });

  it("إن اجتمعت مملوءة وفارغة فيكشف الفارغة", () => {
    expect(hasEmptyPlaceholder("\\placeholder{6}+\\placeholder{}")).toBe(true);
  });

  it("يعيد مسارات الحقول التي فيها خانة فارغة فقط", () => {
    const payload = {
      content: "$6\\cdot3=\\placeholder{}$",
      explanation: "شرح سليم $x^2$",
      options: [
        { content: "$7$", isCorrect: true },
        { content: "$\\placeholder{}$", isCorrect: false },
      ],
      acceptedAnswers: [],
    };
    expect(emptyPlaceholderPaths(payload).sort()).toEqual(["content", "options.1.content"]);
  });

  it("لا مسارات إن لم توجد خانات فارغة", () => {
    expect(emptyPlaceholderPaths({ content: "$x$", options: [{ content: "$\\placeholder{3}$" }] })).toEqual([]);
  });
});

const render = (tex: string) =>
  katex.renderToString(normalizeMathliveTex(tex), {
    throwOnError: false,
    output: "html",
    macros: mathliveMacros(),
  });

describe("أوامر MathLive غير المعروفة لـKaTeX", () => {
  const samples = [
    "6\\cdot3=\\pi\\int_0^{\\infty}\\!\\placeholder{}\\,\\mathrm{d}x",
    "\\imaginaryI\\pi",
    "\\colorbox{#fbbbb6}{ 6 }\\exponentialE25",
    "\\placeholder[x]{7}+\\placeholder[y]{}",
    "\\differentialD x+\\capitalDifferentialD y+\\imaginaryJ",
  ];

  it("تُرسم بلا خطأ (لا #cc0000) بعد التحويل", () => {
    for (const s of samples) {
      expect(render(s), s).not.toContain("#cc0000");
    }
  });

  it("كانت تُنتج خطأً قبل التحويل (الدليل على الحاجة إليه)", () => {
    const raw = katex.renderToString("\\imaginaryI\\pi", { throwOnError: false, output: "html" });
    expect(raw).toContain("#cc0000");
  });

  it("الصندوق: فارغ ← □ ، بمحتوى ← \\boxed", () => {
    expect(normalizeMathliveTex("a+\\placeholder{}")).toBe("a+\\square");
    expect(normalizeMathliveTex("a+\\placeholder[id]{3x}")).toBe("a+\\boxed{3x}");
    expect(normalizeMathliveTex("\\placeholder")).toBe("\\square");
  });

  it("نصّ بلا أوامر MathLive لا يتغيّر", () => {
    expect(normalizeMathliveTex("x^2+1")).toBe("x^2+1");
  });
});
