import { describe, it, expect } from "vitest";
import { buildMatchingLayout, stripLeadingEnumerator } from "./matchingPrint";

const pairs = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ left: `L${i}`, right: `R${i}` }));

describe("buildMatchingLayout", () => {
  it("الجواب الصحيح لكل عنصر يقع في الموضع الذي تسجّله answers", () => {
    const p = pairs(6);
    const lay = buildMatchingLayout(p, "q1");
    expect(lay.lefts).toEqual(p.map((x) => x.left));
    lay.answers.forEach((pos, i) => expect(lay.rights[pos]).toBe(`R${i}`));
  });
  it("لا تقابل أيّ خانةٍ جوابَها في الصفّ نفسه (n ≥ 2)", () => {
    for (let n = 2; n <= 8; n++) {
      for (let s = 0; s < 50; s++) {
        const lay = buildMatchingLayout(pairs(n), `seed-${n}-${s}`);
        lay.answers.forEach((pos, i) => expect(pos).not.toBe(i));
      }
    }
  });
  it("كل الأجوبة موجودة مرّة واحدة (تبديل كامل)", () => {
    const lay = buildMatchingLayout(pairs(7), "x");
    expect([...lay.rights].sort()).toEqual(pairs(7).map((p) => p.right).sort());
    expect(new Set(lay.answers).size).toBe(7);
  });
  it("ثابت بنفس البذرة ومختلف غالباً بغيرها", () => {
    const a = buildMatchingLayout(pairs(6), "same");
    const b = buildMatchingLayout(pairs(6), "same");
    expect(a).toEqual(b);
    const others = new Set(
      ["a", "b", "c", "d", "e", "f"].map((s) => buildMatchingLayout(pairs(6), s).rights.join(","))
    );
    expect(others.size).toBeGreaterThan(1);
  });
  it("زوج واحد أو فارغ لا يفشل", () => {
    expect(buildMatchingLayout(pairs(1), "x").answers).toEqual([0]);
    expect(buildMatchingLayout([], "x")).toEqual({ lefts: [], rights: [], answers: [] });
  });
});

describe("stripLeadingEnumerator", () => {
  it("يحذف حرفاً/رقماً أوّلياً مع نقطة أو قوس", () => {
    expect(stripLeadingEnumerator("د. احتفاظ العضلة بتقلصها")).toBe("احتفاظ العضلة بتقلصها");
    expect(stripLeadingEnumerator("1. الانقباض")).toBe("الانقباض");
    expect(stripLeadingEnumerator("١) الإطالة")).toBe("الإطالة");
    expect(stripLeadingEnumerator("(ب) المرونة")).toBe("المرونة");
    expect(stripLeadingEnumerator("هـ. التهيّج")).toBe("التهيّج");
    expect(stripLeadingEnumerator("C- tissue")).toBe("tissue");
  });
  it("لا يمسّ النصّ العادي ولا الألقاب", () => {
    expect(stripLeadingEnumerator("الانقباض")).toBe("الانقباض");
    expect(stripLeadingEnumerator("أ.د. محمد")).toBe("أ.د. محمد");
    expect(stripLeadingEnumerator("و ما بعده")).toBe("و ما بعده");
    expect(stripLeadingEnumerator("3.5 غرام")).toBe("3.5 غرام");
  });
  it("إن لم يبقَ نصّ يُعاد الأصل", () => {
    expect(stripLeadingEnumerator("أ. ")).toBe("أ.");
  });
  it("buildMatchingLayout يطبّقه على العمودين", () => {
    const lay = buildMatchingLayout(
      [
        { left: "1. الانقباض", right: "د. تقصّر الليف" },
        { left: "2. الإطالة", right: "ج. عودة الليف" },
      ],
      "s"
    );
    expect(lay.lefts).toEqual(["الانقباض", "الإطالة"]);
    expect([...lay.rights].sort()).toEqual(["تقصّر الليف", "عودة الليف"].sort());
  });
});
