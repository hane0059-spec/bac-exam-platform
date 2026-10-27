import { describe, it, expect } from "vitest";
import { assignMatch, clearMatch, nextUnmatched, ownerOf } from "./matchingUi";

describe("assignMatch", () => {
  it("يربط عنصراً بنصّ أيمن", () => {
    expect(assignMatch(["", "", ""], 1, "x")).toEqual(["", "x", ""]);
  });
  it("الربط واحد-لواحد: نصّ مستعمَل ينتقل ويُفرَّغ مالكه القديم", () => {
    expect(assignMatch(["x", "", "y"], 2, "x")).toEqual(["", "", "x"]);
  });
  it("إعادة ربط عنصر بنصّ آخر تستبدل اختياره", () => {
    expect(assignMatch(["x", "y"], 0, "z")).toEqual(["z", "y"]);
  });
  it("ربط عنصر بالنصّ نفسه لا يغيّر شيئاً", () => {
    expect(assignMatch(["x", "y"], 0, "x")).toEqual(["x", "y"]);
  });
  it("نصّ فارغ لا يمسح غيره", () => {
    expect(assignMatch(["", "y", ""], 0, "")).toEqual(["", "y", ""]);
  });
});

describe("clearMatch / ownerOf / nextUnmatched", () => {
  it("clearMatch يفرّغ عنصراً واحداً", () => {
    expect(clearMatch(["x", "y"], 0)).toEqual(["", "y"]);
  });
  it("ownerOf", () => {
    expect(ownerOf(["a", "b"], "b")).toBe(1);
    expect(ownerOf(["a", "b"], "c")).toBe(-1);
    expect(ownerOf(["", "b"], "")).toBe(-1);
  });
  it("nextUnmatched دائري ويُعيد null عند الاكتمال", () => {
    expect(nextUnmatched(["a", "", "c", ""], 0)).toBe(1);
    expect(nextUnmatched(["a", "", "c", ""], 1)).toBe(3);
    expect(nextUnmatched(["a", "", "c", ""], 3)).toBe(1);
    expect(nextUnmatched(["a", "b"], 0)).toBeNull();
  });
});
