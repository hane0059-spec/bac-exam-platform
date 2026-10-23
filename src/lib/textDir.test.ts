import { describe, it, expect } from "vitest";
import {
  isLatinText,
  isLatinQuestion,
  isLatinExam,
  displayOptionLabel,
  displayOptionContent,
} from "./textDir";

const mc = (content: string, opts: string[]) => ({
  type: "MULTIPLE_CHOICE",
  content,
  options: opts.map((c) => ({ content: c })),
});

describe("textDir", () => {
  it("يكشف النصّ اللاتيني الغالب", () => {
    expect(isLatinText("Which organelle?")).toBe(true);
    expect(isLatinText("ما العضيّة؟")).toBe(false);
    expect(isLatinText("ما معنى apple؟")).toBe(false); // العربية أكثر
    expect(isLatinText("")).toBe(false);
    expect(isLatinText("123 + 45")).toBe(false);
  });

  it("صح/خطأ العربيان لا يُرجِّحان العربية على سؤال إنكليزي", () => {
    const tf = { type: "TRUE_FALSE", content: "The sun is a star.", options: [{ content: "صح" }, { content: "خطأ" }] };
    expect(isLatinQuestion(tf)).toBe(true);
    const mcAr = mc("ما الاختيار الصحيح؟", ["أ", "ب"]);
    expect(isLatinQuestion(mcAr)).toBe(false);
  });

  it("الاختبار إنكليزي بأغلبية الأسئلة فقط", () => {
    const en = mc("Choose the answer", ["a", "b"]);
    const ar = mc("اختر الإجابة", ["س", "ص"]);
    expect(isLatinExam([en, en, ar])).toBe(true);
    expect(isLatinExam([en, ar])).toBe(false);
    expect(isLatinExam([])).toBe(false);
  });

  it("تسميات الخيارات ونصّ صح/خطأ تتحوّل للإنكليزية فقط عند الحاجة", () => {
    expect(displayOptionLabel("أ", 0, true)).toBe("A");
    expect(displayOptionLabel("ج", 2, true)).toBe("C");
    expect(displayOptionLabel("هـ", 4, true)).toBe("E");
    expect(displayOptionLabel("أ", 0, false)).toBe("أ");
    expect(displayOptionLabel("1", 0, true)).toBe("1"); // أرقام الفراغات تبقى
    expect(displayOptionContent("صح", "TRUE_FALSE", true)).toBe("True");
    expect(displayOptionContent("خطأ", "TRUE_FALSE", true)).toBe("False");
    expect(displayOptionContent("صح", "TRUE_FALSE", false)).toBe("صح");
    expect(displayOptionContent("صح", "MULTIPLE_CHOICE", true)).toBe("صح");
  });
});
