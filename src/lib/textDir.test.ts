import { describe, it, expect } from "vitest";
import {
  subjectLang,
  questionLang,
  examLang,
  displayOptionLabel,
  displayOptionContent,
  defaultOptionLetter,
} from "./textDir";
import { EXAM_STRINGS } from "./examStrings";

const mc = (content: string, opts: string[] = []) => ({
  type: "MULTIPLE_CHOICE",
  content,
  options: opts.map((c) => ({ content: c })),
});
const tf = (content: string) => ({
  type: "TRUE_FALSE",
  content,
  options: [{ content: "صح" }, { content: "خطأ" }],
});

describe("textDir — كشف اللغة", () => {
  it("لغة المادة من اسمها", () => {
    expect(subjectLang("اللغة الإنجليزية")).toBe("en");
    expect(subjectLang("اللغة الإنكليزية")).toBe("en");
    expect(subjectLang("اللغة الفرنسية")).toBe("fr");
    expect(subjectLang("اللغة الروسية")).toBe("ru");
    expect(subjectLang("الفيزياء")).toBeNull();
    expect(subjectLang(null)).toBeNull();
  });

  it("السكربت يحسم: سيريلي ← روسي، عربي ← عربي", () => {
    expect(questionLang(mc("Какой орган качает кровь?"))).toBe("ru");
    expect(questionLang(mc("ما العضيّة؟"))).toBe("ar");
    expect(questionLang(mc("123 + 45"))).toBe("ar");
  });

  it("اللاتيني يتبع لغة المادة، وإلا يُقدَّر: فرنسي بالحروف المعلّمة والكلمات", () => {
    expect(questionLang(mc("hmkjfgk"), "en")).toBe("en");
    expect(questionLang(mc("hmkjfgk"), "fr")).toBe("fr");
    expect(questionLang(mc("Quel est le rôle de la mitochondrie ?"))).toBe("fr");
    expect(questionLang(mc("What is the role of the mitochondria?"))).toBe("en");
    expect(questionLang(mc("hmkjfgk"))).toBe("en"); // غامض → إنكليزي
  });

  it("صح/خطأ العربيان لا يُرجِّحان العربية", () => {
    expect(questionLang(tf("The sun is a star."))).toBe("en");
    expect(questionLang(tf("Le soleil est une étoile."))).toBe("fr");
    expect(questionLang(tf("Солнце — звезда."))).toBe("ru");
  });

  it("لغة الاختبار بأغلبية الأسئلة غير العربية", () => {
    const en = mc("Choose the answer", ["a", "b"]);
    const ar = mc("اختر الإجابة", ["س", "ص"]);
    const ru = mc("Выберите ответ", ["а", "б"]);
    expect(examLang([en, en, ar], "اللغة الإنجليزية")).toBe("en");
    expect(examLang([en, ar])).toBe("ar");
    expect(examLang([ru, ru, ar])).toBe("ru");
    expect(examLang([mc("hmkjfgk"), mc("abc")], "اللغة الفرنسية")).toBe("fr");
    expect(examLang([])).toBe("ar");
  });
});

describe("textDir — التسميات", () => {
  it("حرف الخيار: A/B لاتيني وА/Б للروسية وأ/ب للعربية", () => {
    expect(defaultOptionLetter(0, "en")).toBe("A");
    expect(defaultOptionLetter(2, "fr")).toBe("C");
    expect(defaultOptionLetter(1, "ru")).toBe("Б");
    expect(defaultOptionLetter(0, "ar")).toBe("أ");
    expect(defaultOptionLetter(2, "ar")).toBe("ج");
    expect(defaultOptionLetter(3, "ar")).toBe("د");
    expect(defaultOptionLetter(4, "ar")).toBe("هـ");
    expect(defaultOptionLetter(12, "ar")).toBe("13");
  });

  it("تحويل تسمية الخيار العربية للغة السؤال فقط", () => {
    expect(displayOptionLabel("أ", 0, "en")).toBe("A");
    expect(displayOptionLabel("ج", 2, "fr")).toBe("C");
    expect(displayOptionLabel("ب", 1, "ru")).toBe("Б");
    expect(displayOptionLabel("هـ", 4, "en")).toBe("E");
    expect(displayOptionLabel("أ", 0, "ar")).toBe("أ");
    expect(displayOptionLabel("1", 0, "en")).toBe("1");
  });

  it("صح/خطأ بلغة السؤال", () => {
    expect(displayOptionContent("صح", "TRUE_FALSE", "en")).toBe("True");
    expect(displayOptionContent("خطأ", "TRUE_FALSE", "en")).toBe("False");
    expect(displayOptionContent("صح", "TRUE_FALSE", "fr")).toBe("Vrai");
    expect(displayOptionContent("خطأ", "TRUE_FALSE", "fr")).toBe("Faux");
    expect(displayOptionContent("صح", "TRUE_FALSE", "ru")).toBe("Верно");
    expect(displayOptionContent("خطأ", "TRUE_FALSE", "ru")).toBe("Неверно");
    expect(displayOptionContent("صح", "TRUE_FALSE", "ar")).toBe("صح");
    expect(displayOptionContent("صح", "MULTIPLE_CHOICE", "en")).toBe("صح");
  });
});

describe("examStrings", () => {
  it("جمع الروسية للدرجات والأسئلة", () => {
    const m = EXAM_STRINGS.ru.marks;
    expect(m(1)).toBe("(1 балл)");
    expect(m(2)).toBe("(2 балла)");
    expect(m(5)).toBe("(5 баллов)");
    expect(m(11)).toBe("(11 баллов)");
    expect(m(21)).toBe("(21 балл)");
    expect(m(1.5)).toBe("(1.5 балла)");
    expect(EXAM_STRINGS.ru.summary(3, 10)).toContain("3 вопроса");
  });

  it("الفرنسية والإنكليزية: مفرد/جمع", () => {
    expect(EXAM_STRINGS.fr.marks(1)).toBe("(1 point)");
    expect(EXAM_STRINGS.fr.marks(2)).toBe("(2 points)");
    expect(EXAM_STRINGS.fr.marks(0.5)).toBe("(0.5 point)");
    expect(EXAM_STRINGS.en.marks(1)).toBe("(1 mark)");
    expect(EXAM_STRINGS.en.marks(3)).toBe("(3 marks)");
    expect(EXAM_STRINGS.fr.types.TRUE_FALSE).toBe("Vrai / Faux");
  });
});
