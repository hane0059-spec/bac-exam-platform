"use client";
// src/components/teacher/PrintableExam.tsx
// عرض قابل للطباعة: ورقة أسئلة + سلّم تصحيح، مع خيارات مدمجة لتوفير الورق.
import { Fragment, useState } from "react";
import MathText from "@/components/MathText";
import {
  examLang,
  questionLang,
  subjectLang,
  displayOptionLabel,
  displayOptionContent,
  defaultOptionLetter,
  paragraphDir,
  type Lang,
} from "@/lib/textDir";
import { EXAM_STRINGS } from "@/lib/examStrings";
import type { MatchingPrintLayout } from "@/lib/matchingPrint";
import { needsFullWidth, optionsFitOneLine } from "@/lib/printLayout";

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
  // المطابقة: تخطيط الجدولين المتقابلين (يُحسب في الخادم).
  matching?: MatchingPrintLayout | null;
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

// صح / خطأ: خيارا الاختيار يُعرَضان بعد نصّ السؤال في سطره نفسه لتوفير المساحة.
function TfChoices({
  q,
  showKey,
  lang,
}: {
  q: PrintQuestion;
  showKey: boolean;
  lang: Lang;
}) {
  return (
    <span className="inline-flex shrink-0 flex-wrap items-center gap-x-5 text-sm">
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
            <MathText text={displayOptionContent(o.content, q.type, lang)} />
          </span>
        );
      })}
    </span>
  );
}

// المطابقة: جدولان متقابلان بينهما فراغ، في كل خانة نقطة اتصال على حافتها الداخلية ليصل الطالب بخطّ القلم.
function MatchingBlock({
  q,
  showKey,
  lang,
}: {
  q: PrintQuestion;
  showKey: boolean;
  lang: Lang;
}) {
  const m = q.matching;
  if (!m || m.lefts.length === 0) return null;
  const dot = (
    <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink/70 bg-white" />
  );
  const cell =
    "flex items-center gap-1.5 rounded-md border border-ink/40 bg-white/60 px-2 py-1.5 text-sm leading-snug print:py-1";
  return (
    <div className="mt-2">
      <div className="grid grid-cols-[1fr_4.5rem_1fr] gap-y-2 print:gap-y-1.5">
        {m.lefts.map((l, i) => (
          <Fragment key={i}>
            <div className={cell}>
              <span className="shrink-0 font-semibold text-ink/55">{i + 1}.</span>
              <span className="min-w-0 flex-1">
                <MathText text={l} />
              </span>
              {dot}
            </div>
            <div aria-hidden />
            <div className={cell}>
              {dot}
              <span className="shrink-0 font-semibold text-ink/55">
                {defaultOptionLetter(i, lang)}.
              </span>
              <span className="min-w-0 flex-1">
                <MathText text={m.rights[i] ?? ""} />
              </span>
            </div>
          </Fragment>
        ))}
      </div>
      {showKey && (
        <p className="mt-2 rounded bg-primary-light px-2 py-0.5 text-sm font-medium text-primary-dark">
          {EXAM_STRINGS[lang].answer}
          {m.answers
            .map((pos, i) => `${i + 1} ← ${defaultOptionLetter(pos, lang)}`)
            .join("   ")}
        </p>
      )}
    </div>
  );
}

// عرض الخيارات حسب نوع السؤال (مدمج لتوفير الورق).
function OptionsBlock({
  q,
  showKey,
  lang,
}: {
  q: PrintQuestion;
  showKey: boolean;
  lang: Lang;
}) {
  if (q.options.length === 0) return null;

  // صح / خطأ: تُعرَض بعد نصّ السؤال في سطره (TfChoices) لا هنا.
  if (q.type === "TRUE_FALSE") return null;

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
            {EXAM_STRINGS[lang].correctOrder} {q.acceptedAnswers[0]}
          </p>
        )}
      </div>
    );
  }

  // اختيار من متعدد وغيره: سطر واحد إن كانت الخيارات قصيرة، وإلا شبكة عمودَين لتوفير الورق.
  if (optionsFitOneLine(q.options)) {
    return (
      <ul className="mt-1.5 flex flex-wrap gap-x-6 gap-y-0.5 text-sm">
        {q.options.map((o, i) => {
          const correct = showKey && o.isCorrect;
          return (
            <li
              key={i}
              className={`flex items-start gap-1 ${
                correct ? "font-semibold text-primary-dark" : "text-ink/80"
              }`}
            >
              <span className="shrink-0 font-medium">
                {o.label && o.label !== o.content
                  ? `${displayOptionLabel(o.label, i, lang)}.`
                  : `${defaultOptionLetter(i, lang)}.`}
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
              {o.label && o.label !== o.content
                ? `${displayOptionLabel(o.label, i, lang)}.`
                : `${defaultOptionLetter(i, lang)}.`}
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
  // ضغط أكبر: الأسئلة في عمودين وخطّ أصغر لتقليل عدد الصفحات المطبوعة.
  const [compact, setCompact] = useState(false);
  // لغة الورقة (عربي/إنكليزي/فرنسي/روسي): تحدّد الترويسة والتسميات والاتجاه (LTR لغير العربي).
  const hint = subjectLang(data.subjectName);
  const lang = examLang(data.questions, data.subjectName);
  const S = EXAM_STRINGS[lang];

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
        <label className="flex cursor-pointer items-center gap-1.5 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={compact}
            onChange={(e) => setCompact(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          ضغط أكبر (عمودان)
        </label>
        <button
          onClick={() => window.print()}
          className="btn-primary mr-auto px-4 py-1.5 text-sm"
        >
          اطبع
        </button>
      </div>

      <div dir={lang === "ar" ? undefined : "ltr"}>
      {/* الترويسة */}
      <div className="mb-4 border-b border-line pb-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">{data.title}</h1>
          <span className="text-sm text-ink/60">
            {view === "key" ? S.key : S.sheet}
          </span>
        </div>
        <p className="mt-1 text-sm text-ink/60">
          <bdi>{data.subjectName}</bdi>
          {S.summary(data.questions.length, data.totalPoints)}
        </p>
        {data.description && (
          <p className="mt-1 text-sm leading-relaxed text-ink/70">
            {data.description}
          </p>
        )}
        {view === "questions" && (
          <div className="mt-2 flex flex-wrap gap-x-10 gap-y-0.5 text-sm text-ink/70">
            <span>{S.name} ............................................</span>
            <span>{S.cls} ......................</span>
            <span>{S.date} ......................</span>
          </div>
        )}
      </div>

      {/* الأسئلة — حشو مضغوط لتوفير الورق */}
      <ol
        className={
          compact
            ? "columns-2 gap-x-6 [column-rule:1px_solid_rgb(var(--line))] text-[13px]"
            : "space-y-2 print:space-y-1"
        }
      >
        {data.questions.map((q) => {
          const ql = questionLang(q, hint);
          const QS = EXAM_STRINGS[ql];
          return (
          <li
            key={q.index}
            dir={ql === "ar" ? undefined : "ltr"}
            className={`break-inside-avoid rounded-xl border border-line p-3 print:rounded-none print:border-x-0 print:border-t-0 print:border-b print:p-2 ${
              compact
                ? `mb-2 !p-2 leading-snug print:mb-0 ${needsFullWidth(q) ? "[column-span:all]" : ""}`
                : ""
            }`}
          >
            {/* رأس السؤال */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-5 gap-y-1">
                <p dir={paragraphDir(ql)} className="font-medium leading-snug">
                  {q.index}. <MathText text={q.content} />
                </p>
                {q.type === "TRUE_FALSE" && q.options.length > 0 && (
                  <TfChoices q={q} showKey={view === "key"} lang={ql} />
                )}
              </div>
              <span className="shrink-0 whitespace-nowrap text-xs text-ink/50">
                {QS.marks(q.points)}
                <span className="text-ink/35"> • {QS.types[q.type] ?? q.type}</span>
              </span>
            </div>

            {q.imageId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/attachments/${q.imageId}`}
                alt="رسم السؤال"
                className="mb-2 max-h-64 rounded-lg border border-line object-contain"
              />
            )}

            {/* الخيارات */}
            {q.type === "MATCHING" && q.matching ? (
              <MatchingBlock q={q} showKey={view === "key"} lang={ql} />
            ) : q.options.length > 0 ? (
              <OptionsBlock q={q} showKey={view === "key"} lang={ql} />
            ) : view === "key" ? (
              q.acceptedAnswers.length > 0 ? (
                <p className="mt-1 text-sm">
                  <span className="text-ink/50">{QS.answer}</span>
                  <span className="font-medium text-primary-dark">
                    {q.acceptedAnswers.join(" / ")}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink/50">{QS.manual}</p>
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
          );
        })}
      </ol>
      </div>
    </div>
  );
}
