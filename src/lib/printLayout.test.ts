import { describe, it, expect } from "vitest";
import { needsFullWidth, optionsFitOneLine } from "./printLayout";

const opts = (...c: string[]) => c.map((content) => ({ content }));

describe("optionsFitOneLine", () => {
  it("خيارات قصيرة ← سطر واحد", () => {
    expect(optionsFitOneLine(opts("الماء", "الدهون", "السكر", "أملاح الكالسيوم"))).toBe(true);
  });
  it("خيار طويل ← لا", () => {
    expect(optionsFitOneLine(opts("قصير", "عبارة طويلة جداً تتجاوز الحدّ المسموح للسطر الواحد في الورقة"))).toBe(false);
  });
  it("مجموع طويل ← لا حتى لو كل خيار قصير نسبياً", () => {
    const c = "x".repeat(20);
    expect(optionsFitOneLine(opts(c, c, c, c))).toBe(false); // 4×25 = 100 > 78
    expect(optionsFitOneLine(opts(c, c, c))).toBe(true); // 75
  });
  it("أكثر من 5 خيارات أو لا خيارات ← لا", () => {
    expect(optionsFitOneLine([])).toBe(false);
    expect(optionsFitOneLine(opts("a", "b", "c", "d", "e", "f"))).toBe(false);
  });
});

describe("needsFullWidth", () => {
  const o = (...c: string[]) => c.map((content) => ({ content }));
  it("المطابقة وتوسيم الرسم بعرض كامل", () => {
    expect(needsFullWidth({ type: "MATCHING", options: [] })).toBe(true);
    expect(needsFullWidth({ type: "DIAGRAM_LABEL", options: [] })).toBe(true);
  });
  it("صح/خطأ والمقالي وخيارات قصيرة ← نصف الصفحة", () => {
    expect(needsFullWidth({ type: "TRUE_FALSE", options: o("صح", "خطأ") })).toBe(false);
    expect(needsFullWidth({ type: "ESSAY", options: [] })).toBe(false);
    expect(needsFullWidth({ type: "MULTIPLE_CHOICE", options: o("أ", "ب", "ج", "د") })).toBe(false);
  });
  it("اختيار من متعدد بخيار طويل جداً ← عرض كامل", () => {
    const long = "x".repeat(50);
    expect(needsFullWidth({ type: "MULTIPLE_CHOICE", options: o(long, "ب", "ج", "د") })).toBe(true);
  });
});
