"use client";
// src/components/teacher/PrintableExam.tsx
// عرض قابل للطباعة: ورقة أسئلة + سلّم تصحيح، مع خيارات مدمجة لتوفير الورق.
import { useState } from "react";
import MathText from "@/components/MathText";

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "اختيار من متعدد",
  TRUE_FALSE: "صح / خطأ",
  SHORT_ANSWER: "إجابة قصيرة",
  ESSAY: "مقالي",
  MATCHING: "مطابقة",
  FILL_BLANK: "ملء فراغ",
  DIAGRAM_LABEL: "توسيم رسم",
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
  imageId?: string | null;
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

// عرض الخيارات حسب نوع السؤال (مدمج لتوفير الورق).
function OptionsBlock({
  q,
  showKey,
}: {
  q: PrintQuestion;
  showKey: boolean;
}) {
  if (q.options.length === 0) return null;

  // صح / خطأ: خيارَان في صفّ أفقي واحد.
  if (q.type === "TRUE_FALSE") {
    return (
      <div className="mt-1.5 flex flex-wrap gap-x-8 gap-y-0.5 text-sm">
        {q.options.map((o, i) => {
          const correct = showKey && o.isCorrect;
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1.5 ${
                correct ? "font-semibold text-primary-dark" : "text-ink/80"
              }`}
            >
              <span
                className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                  correct
                    ? "border-primary bg-primary-light text-primary-dark"
                    : "border-line"
                }`}
              >
                {correct ? "✓" : ""}
              </span>
              <MathText text={o.content} />
            </span>
          );
        })}
      </div>
    );
  }

  // ترتيب: عناصر أفقية (تُرتَّب بالأسهم على الشاشة، هنا تُعرَض للترقيم).
  if (q.type === "ORDER") {
    return (
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-ink/80">
        {q.options.map((o, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line text-[10px] font-medium text-ink/50">
              {i + 1}
            </span>
            <MathText text={o.content} />
          </span>
        ))}
        {showKey && q.acceptedAnswers[0] && (
          <p className="mt-1 w-full rounded bg-primary-light px-2 py-0.5 text-xs font-medium text-primary-dark">
            الترتيب الصحيح: {q.acceptedAnswers[0]}
          </p>
        )}
      </div>
    );
  }

  // اختيار من متعدد وغيره: شبكة عمودَين لتوفير الورق.
  return (
    <ul className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
      {q.options.map((o, i) => {
        const correct = showKey && o.isCorrect;
        return (
          <li
            key={i}
            className={`flex items-start gap-1 ${
              correct
                ? "font-semibold text-primary-dark"
                : "text-ink/80"
            }`}
          >
            <span className="shrink-0 font-medium">
              {o.label && o.label !== o.content ? `${o.label}.` : `${String.fromCharCode(0x0627 + i)}.`}
            </span>
            <span className="leading-snug">
              <MathText text={o.content} />
              {correct && " ✓"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function PrintableExam({ data }: { data: PrintExamData }) {
  const [view, setView] = useState<View>("questions");

  const tab = (v: View) =>
    `rounded-full px-4 py-1.5 text-sm transition ${
      view === v
        ? "bg-primary text-white"
        : "bg-ink/5 text-ink/70 hover:bg-primary-light"
    }`;

  return (
    <div>
      {/* شريط أدوات — يختفي عند الطباعة */}
      <div className="mb-5 flex flex-wrap items-center gap-2 print:hidden">
        <button onClick={() => setView("questions")} className={tab("questions")}>
          ورقة الأسئلة
        </button>
        <button onClick={() => setView("key")} className={tab("key")}>
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
      <div className="mb-4 border-b border-line pb-3">
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
          <p className="mt-1 text-sm leading-relaxed text-ink/70">
            {data.description}
          </p>
        )}
        {view === "questions" && (
          <div className="mt-2 flex flex-wrap gap-x-10 gap-y-0.5 text-sm text-ink/70">
            <span>الاسم: ............................................</span>
            <span>الصفّ: ......................</span>
            <span>التاريخ: ......................</span>
          </div>
        )}
      </div>

      {/* الأسئلة — حشو مضغوط لتوفير الورق */}
      <ol className="space-y-2 print:space-y-1">
        {data.questions.map((q) => (
          <li
            key={q.index}
            className="rounded-xl border border-line p-3 print:rounded-none print:border-x-0 print:border-t-0 print:border-b print:p-2"
          >
            {/* رأس السؤال */}
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium leading-snug">
                {q.index}. <MathText text={q.content} />
              </p>
              <span className="shrink-0 text-xs text-ink/50">({q.points} ن)</span>
            </div>
            <p className="mb-1 text-[11px] text-ink/35">{TYPE_LABEL[q.type] ?? q.type}</p>

            {q.imageId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/attachments/${q.imageId}`}
                alt="رسم السؤال"
                className="mb-2 max-h-64 rounded-lg border border-line object-contain"
              />
            )}

            {/* الخيارات */}
            {q.options.length > 0 ? (
              <OptionsBlock q={q} showKey={view === "key"} />
            ) : view === "key" ? (
              q.acceptedAnswers.length > 0 ? (
                <p className="mt-1 text-sm">
                  <span className="text-ink/50">الإجابة: </span>
                  <span className="font-medium text-primary-dark">
                    {q.acceptedAnswers.join(" / ")}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink/50">يُصحَّح يدوياً.</p>
              )
            ) : (
              /* فراغ الإجابة — سطر واحد للقصيرة/الحساب، سطران للمقالي */
              <div className={`mt-1 space-y-2 ${q.type === "ESSAY" ? "" : "space-y-2"}`}>
                <div className="border-b border-dashed border-line" />
                {q.type === "ESSAY" && (
                  <div className="border-b border-dashed border-line" />
                )}
              </div>
            )}

            {view === "key" && q.explanation && (
              <p className="mt-1 text-xs leading-relaxed text-ink/55">
                <MathText text={q.explanation} />
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
