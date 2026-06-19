"use client";
// src/components/teacher/PrintableExam.tsx
// عرض قابل للطباعة: ورقة الأسئلة أو سلّم التصحيح، مع طباعة المتصفّح.
import { useState } from "react";

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "اختيار من متعدد",
  TRUE_FALSE: "صح / خطأ",
  SHORT_ANSWER: "إجابة قصيرة",
  ESSAY: "مقالي",
  MATCHING: "مطابقة",
  FILL_BLANK: "ملء فراغ",
  DIAGRAM_LABEL: "تسمية رسم",
  CALCULATION: "حساب",
  ORDER: "ترتيب",
};

export interface PrintOption {
  label: string;
  content: string;
  isCorrect: boolean;
}
export interface PrintQuestion {
  index: number;
  type: string;
  content: string;
  points: number;
  options: PrintOption[];
  acceptedAnswers: string[];
  explanation: string | null;
}
export interface PrintExamData {
  title: string;
  description: string | null;
  subjectName: string;
  questions: PrintQuestion[];
  totalPoints: number;
}

type View = "questions" | "key";

export default function PrintableExam({ data }: { data: PrintExamData }) {
  const [view, setView] = useState<View>("questions");

  const tab = (v: View, label: string) =>
    `rounded-full px-4 py-1.5 text-sm transition ${
      view === v
        ? "bg-primary text-white"
        : "bg-ink/5 text-ink/70 hover:bg-primary-light"
    }`;

  return (
    <div>
      {/* شريط أدوات — يختفي عند الطباعة */}
      <div className="mb-5 flex flex-wrap items-center gap-2 print:hidden">
        <button onClick={() => setView("questions")} className={tab("questions", "")}>
          ورقة الأسئلة
        </button>
        <button onClick={() => setView("key")} className={tab("key", "")}>
          سلّم التصحيح
        </button>
        <button
          onClick={() => window.print()}
          className="btn-primary mr-auto px-4 py-1.5 text-sm"
        >
          اطبع
        </button>
      </div>

      {/* الترويسة */}
      <div className="mb-5 border-b border-line pb-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">{data.title}</h1>
          <span className="text-sm text-ink/60">
            {view === "key" ? "سلّم التصحيح" : "ورقة الأسئلة"}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink/60">
          {data.subjectName} • {data.questions.length} سؤال • الدرجة الكلّية:{" "}
          {data.totalPoints}
        </p>
        {data.description && (
          <p className="mt-2 text-sm leading-relaxed text-ink/70">
            {data.description}
          </p>
        )}
        {view === "questions" && (
          <div className="mt-3 flex flex-wrap gap-x-10 gap-y-1 text-sm text-ink/70">
            <span>الاسم: ............................................</span>
            <span>الصفّ: ......................</span>
            <span>التاريخ: ......................</span>
          </div>
        )}
      </div>

      {/* الأسئلة */}
      <ol className="space-y-4">
        {data.questions.map((q) => (
          <li key={q.index} className="print-card rounded-xl border border-line p-4">
            <div className="mb-1 flex items-start justify-between gap-3">
              <p className="font-medium leading-relaxed">
                {q.index}. {q.content}
              </p>
              <span className="shrink-0 text-sm text-ink/50">
                ({q.points} نقطة)
              </span>
            </div>
            <p className="mb-2 text-xs text-ink/40">{TYPE_LABEL[q.type] ?? q.type}</p>

            {/* خيارات الاختيار/الصح-خطأ */}
            {q.options.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {q.options.map((o, i) => {
                  const correct = view === "key" && o.isCorrect;
                  return (
                    <li
                      key={i}
                      className={`rounded-lg px-2 py-1 ${
                        correct ? "bg-primary-light font-medium text-primary-dark" : "text-ink/80"
                      }`}
                    >
                      {o.label !== o.content && `${o.label}. `}
                      {o.content}
                      {correct && " ✓"}
                    </li>
                  );
                })}
              </ul>
            ) : view === "key" ? (
              // الإجابة النموذجية للقصيرة، أو ملاحظة للمقالي.
              q.acceptedAnswers.length > 0 ? (
                <p className="text-sm">
                  <span className="text-ink/50">الإجابة النموذجية: </span>
                  <span className="font-medium text-primary-dark">
                    {q.acceptedAnswers.join(" / ")}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-ink/50">يُصحَّح يدوياً.</p>
              )
            ) : (
              // فراغ للإجابة في ورقة الأسئلة.
              <div className="mt-1 space-y-3">
                <div className="border-b border-dashed border-line" />
                <div className="border-b border-dashed border-line" />
              </div>
            )}

            {view === "key" && q.explanation && (
              <p className="mt-2 text-xs leading-relaxed text-ink/60">
                {q.explanation}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
