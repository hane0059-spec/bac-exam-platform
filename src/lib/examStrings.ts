// src/lib/examStrings.ts
// نصوص الورقة المطبوعة حسب لغة الاختبار (عربي/إنكليزي/فرنسي/روسي). آمن للعميل.
import type { Lang } from "@/lib/textDir";

export interface ExamStrings {
  sheet: string;
  key: string;
  name: string;
  cls: string;
  date: string;
  /** ملخّص الترويسة بعد اسم المادة: « • N أسئلة • الدرجة الكلّية: X». */
  summary: (n: number, total: number) => string;
  marks: (n: number) => string;
  types: Record<string, string>;
  correctOrder: string;
  answer: string;
  manual: string;
}

/** جمع الروسية: 1 балл / 2-4 балла / 5+ баллов (الكسور → المفرد المضاف). */
function ruPlural(n: number, one: string, few: string, many: string): string {
  if (!Number.isInteger(n)) return few;
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const EXAM_STRINGS: Record<Lang, ExamStrings> = {
  ar: {
    sheet: "ورقة الأسئلة",
    key: "سلّم التصحيح",
    name: "الاسم:",
    cls: "الصفّ:",
    date: "التاريخ:",
    summary: (n, total) => ` • ${n} سؤال • الدرجة الكلّية: ${total}`,
    marks: (n) => `(${n} درجة)`,
    types: {
      MULTIPLE_CHOICE: "اختيار من متعدد",
      TRUE_FALSE: "صح / خطأ",
      SHORT_ANSWER: "إجابة قصيرة",
      ESSAY: "مقالي",
      MATCHING: "مطابقة",
      FILL_BLANK: "ملء فراغ",
      DIAGRAM_LABEL: "توسيم رسم",
      CALCULATION: "حساب",
      ORDER: "ترتيب",
    },
    correctOrder: "الترتيب الصحيح:",
    answer: "الإجابة: ",
    manual: "يُصحَّح يدوياً.",
  },
  en: {
    sheet: "Question paper",
    key: "Answer key",
    name: "Name:",
    cls: "Class:",
    date: "Date:",
    summary: (n, total) =>
      ` • ${n} ${n === 1 ? "question" : "questions"} • Total marks: ${total}`,
    marks: (n) => `(${n} ${n === 1 ? "mark" : "marks"})`,
    types: {
      MULTIPLE_CHOICE: "Multiple choice",
      TRUE_FALSE: "True / False",
      SHORT_ANSWER: "Short answer",
      ESSAY: "Essay",
      MATCHING: "Matching",
      FILL_BLANK: "Fill in the blank",
      DIAGRAM_LABEL: "Label the diagram",
      CALCULATION: "Calculation",
      ORDER: "Put in order",
    },
    correctOrder: "Correct order:",
    answer: "Answer: ",
    manual: "Marked manually.",
  },
  fr: {
    sheet: "Feuille de questions",
    key: "Corrigé",
    name: "Nom :",
    cls: "Classe :",
    date: "Date :",
    summary: (n, total) =>
      ` • ${n} ${n > 1 ? "questions" : "question"} • Total des points : ${total}`,
    marks: (n) => `(${n} ${n >= 2 ? "points" : "point"})`,
    types: {
      MULTIPLE_CHOICE: "Choix multiple",
      TRUE_FALSE: "Vrai / Faux",
      SHORT_ANSWER: "Réponse courte",
      ESSAY: "Rédaction",
      MATCHING: "Appariement",
      FILL_BLANK: "Texte à trous",
      DIAGRAM_LABEL: "Légender le schéma",
      CALCULATION: "Calcul",
      ORDER: "Remettre dans l'ordre",
    },
    correctOrder: "Ordre correct :",
    answer: "Réponse : ",
    manual: "Correction manuelle.",
  },
  ru: {
    sheet: "Лист вопросов",
    key: "Ключ ответов",
    name: "Имя:",
    cls: "Класс:",
    date: "Дата:",
    summary: (n, total) =>
      ` • ${n} ${ruPlural(n, "вопрос", "вопроса", "вопросов")} • Всего баллов: ${total}`,
    marks: (n) => `(${n} ${ruPlural(n, "балл", "балла", "баллов")})`,
    types: {
      MULTIPLE_CHOICE: "Выбор ответа",
      TRUE_FALSE: "Верно / Неверно",
      SHORT_ANSWER: "Краткий ответ",
      ESSAY: "Эссе",
      MATCHING: "Соответствие",
      FILL_BLANK: "Заполните пропуск",
      DIAGRAM_LABEL: "Подпишите схему",
      CALCULATION: "Вычисление",
      ORDER: "Расставьте по порядку",
    },
    correctOrder: "Правильный порядок:",
    answer: "Ответ: ",
    manual: "Проверяется вручную.",
  },
};
