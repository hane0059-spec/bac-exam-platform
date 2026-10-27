import { describe, it, expect } from "vitest";
import { optionsFitOneLine } from "./printLayout";

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
