"use client";
// src/components/student/QuizRunner.tsx
// مُشغّل الاختبار للطالب: بدء/استئناف، عرض الأسئلة، تصحيح فوري، ثم النتيجة والمراجعة.
// لا يستقبل أي إجابة صحيحة قبل الإرسال؛ المؤقّت عرضيّ فقط والفرض على الخادم.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { splitFillTemplate, countBlanks } from "@/lib/grading";
import AppealBox, { type AppealState } from "@/components/student/AppealBox";
import StudentArchiveToggle from "@/components/student/StudentArchiveToggle";
import PrintButton from "@/components/student/PrintButton";
import MathText from "@/components/MathText";
import MathAnswerInput from "@/components/math/MathAnswerInput";

type Gender = "MALE" | "FEMALE";

interface SanitizedOption {
  id: string;
  label: string;
  content: string;
  orderNum: number;
}
interface Question {
  nodeId: string;
  questionId: string;
  type: string;
  content: string;
  points: number;
  options: SanitizedOption[];
  index: number;
  total: number;
  matchLefts?: { id: string; text: string }[];
  matchRights?: string[];
  blankCount?: number;
  imageId?: string | null;
}
interface Reveal {
  needsReview: boolean;
  isCorrect: boolean;
  scoreEarned: number;
  points: number;
  explanation: string | null;
  correctOptions: { id: string; label: string; content: string }[];
  acceptedAnswers: string[];
}
interface ResultItem {
  index: number;
  type: string;
  content: string;
  points: number;
  scoreEarned: number;
  isCorrect: boolean;
  answered: boolean;
  needsReview: boolean;
  isCancelled: boolean;
  explanation: string | null;
  textAnswer: string | null;
  acceptedAnswers: string[];
  options: {
    id: string;
    label: string;
    content: string;
    isCorrect: boolean;
    selected: boolean;
  }[];
}
interface ResultData {
  quizTitle: string;
  status: string;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  items: ResultItem[];
  sessionId?: string;
  quizId?: string;
  appealable?: boolean;
  appeal?: AppealState | null;
  archived?: boolean;
}

type Phase =
  | "intro"
  | "loading"
  | "question"
  | "feedback"
  | "finished"
  | "error";

function mmss(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function QuizRunner({
  quizId,
  title,
  description,
  questionCount,
  timeLimitSec,
  gender,
}: {
  quizId: string;
  title: string;
  description: string | null;
  questionCount: number;
  timeLimitSec: number | null;
  gender: Gender;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [pendingFinish, setPendingFinish] = useState(false);
  const [nextQuestion, setNextQuestion] = useState<Question | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [skipNote, setSkipNote] = useState("");
  const [ordered, setOrdered] = useState<SanitizedOption[]>([]);
  const [blanks, setBlanks] = useState<string[]>([]);
  const [matches, setMatches] = useState<string[]>([]);
  const submitting = useRef(false);

  // سؤال الترتيب: ابدأ بالترتيب المعروض (المخلوط) ثم يرتّبه الطالب.
  useEffect(() => {
    if (question?.type === "ORDER") setOrdered(question.options);
    // ملء الفراغات: خانة فارغة لكل فراغ في نصّ القالب.
    if (question?.type === "FILL_BLANK")
      setBlanks(Array(countBlanks(question.content)).fill(""));
    // توسيم الرسم: خانة لكل فراغ مرقّم (عددها من الخادم).
    if (question?.type === "DIAGRAM_LABEL")
      setBlanks(Array(question.blankCount ?? 0).fill(""));
    // المطابقة: اختيار فارغ لكل عنصر أيسر.
    if (question?.type === "MATCHING")
      setMatches(Array(question.matchLefts?.length ?? 0).fill(""));
  }, [question]);

  function moveOrdered(idx: number, dir: -1 | 1) {
    setOrdered((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const a = [...prev];
      [a[idx], a[j]] = [a[j], a[idx]];
      return a;
    });
  }

  const startedFeedback = phase === "feedback";

  const loadResult = useCallback(async (sid: string) => {
    setPhase("loading");
    const res = await fetch(`/api/student/sessions/${sid}/result`);
    if (!res.ok) {
      setError("تعذّر تحميل النتيجة.");
      setPhase("error");
      return;
    }
    setResult((await res.json()) as ResultData);
    setPhase("finished");
  }, []);

  const start = useCallback(async () => {
    setPhase("loading");
    setError("");
    const res = await fetch(`/api/student/quizzes/${quizId}/start`, {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "تعذّر بدء الاختبار.");
      setPhase("error");
      return;
    }
    setSessionId(data.sessionId);
    if (data.finished || !data.question) {
      await loadResult(data.sessionId);
      return;
    }
    setQuestion(data.question as Question);
    setRemaining(data.timeRemainingSec ?? null);
    setSelected("");
    setText("");
    setReveal(null);
    setPhase("question");
  }, [quizId, loadResult]);

  const submit = useCallback(async () => {
    if (submitting.current || !question) return;
    submitting.current = true;
    setSkipNote("");
    const optionIds =
      question.type === "ORDER"
        ? ordered.map((o) => o.id)
        : selected
        ? [selected]
        : [];
    // الفراغات/توسيم الرسم/المطابقة: تُرسَل الإجابات مصفوفةً مرتّبةً (JSON) في حقل النصّ.
    const textPayload =
      question.type === "FILL_BLANK" || question.type === "DIAGRAM_LABEL"
        ? JSON.stringify(blanks)
        : question.type === "MATCHING"
        ? JSON.stringify(matches)
        : text;
    const res = await fetch(`/api/student/sessions/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodeId: question.nodeId,
        optionIds,
        textAnswer: textPayload,
      }),
    });
    const data = await res.json();
    submitting.current = false;
    if (!res.ok) {
      setError(data.error ?? "تعذّر إرسال الإجابة.");
      setPhase("error");
      return;
    }
    if (data.expired) {
      await loadResult(sessionId);
      return;
    }
    // وضع «الكشف في النهاية»: لا تصحيح فوري — تقدّم مباشرةً.
    if (!data.reveal) {
      if (data.finished) {
        await loadResult(sessionId);
      } else {
        setQuestion(data.next as Question);
        setSelected("");
        setText("");
        setReveal(null);
        setPhase("question");
      }
      return;
    }
    setReveal(data.reveal as Reveal);
    setPendingFinish(Boolean(data.finished));
    setNextQuestion((data.next as Question) ?? null);
    setPhase("feedback");
  }, [question, selected, text, ordered, blanks, matches, sessionId, loadResult]);

  const goNext = useCallback(() => {
    if (pendingFinish) {
      void loadResult(sessionId);
      return;
    }
    setQuestion(nextQuestion);
    setNextQuestion(null);
    setReveal(null);
    setSelected("");
    setText("");
    setPhase("question");
  }, [pendingFinish, nextQuestion, sessionId, loadResult]);

  const skip = useCallback(async () => {
    if (submitting.current || !question) return;
    submitting.current = true;
    setSkipNote("");
    const res = await fetch(`/api/student/sessions/${sessionId}/skip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId: question.nodeId }),
    });
    const data = await res.json();
    submitting.current = false;
    if (!res.ok) {
      setError(data.error ?? "تعذّر التخطّي.");
      setPhase("error");
      return;
    }
    if (data.expired) {
      await loadResult(sessionId);
      return;
    }
    if (data.sameNode) {
      setSkipNote("هذا آخر سؤال متبقٍّ — أجب عنه لإنهاء الاختبار.");
      return;
    }
    setQuestion(data.next as Question);
    setSelected("");
    setText("");
    setReveal(null);
    setPhase("question");
  }, [question, sessionId, loadResult]);

  // المؤقّت العرضي — يتناقص كل ثانية أثناء عرض السؤال.
  useEffect(() => {
    if (phase !== "question" || remaining == null) return;
    if (remaining <= 0) {
      void submit();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r == null ? r : r - 1)), 1000);
    return () => clearTimeout(t);
  }, [phase, remaining, submit]);

  // ── العرض ──
  if (phase === "intro") {
    return (
      <div className="card p-6">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        {description && <p className="mt-2 text-ink/70">{description}</p>}
        <ul className="mt-4 space-y-1 text-sm text-ink/70">
          <li>عدد الأسئلة: {questionCount}</li>
          {timeLimitSec && <li>المدة: {Math.round(timeLimitSec / 60)} دقيقة</li>}
        </ul>
        <p className="mt-4 rounded-xl bg-primary-light p-3 text-sm text-primary-dark">
          بمجرّد البدء يعمل المؤقّت ولا يتوقّف. أجب عن كل سؤال ثم انتقل للتالي.
        </p>
        <button onClick={start} className="btn-primary mt-5">
          ابدأ الاختبار
        </button>
      </div>
    );
  }

  if (phase === "loading") {
    return <div className="card p-8 text-center text-ink/60">جارٍ التحميل…</div>;
  }

  if (phase === "error") {
    return (
      <div className="card p-6">
        <p className="text-red-600">{error}</p>
        <Link href="/student/quizzes" className="btn-primary mt-4">
          العودة لاختباراتي
        </Link>
      </div>
    );
  }

  if (phase === "finished" && result) {
    return <ResultView result={result} />;
  }

  if ((phase === "question" || startedFeedback) && question) {
    const isOrder = question.type === "ORDER";
    const isFill = question.type === "FILL_BLANK";
    const isDiagram = question.type === "DIAGRAM_LABEL";
    const isMatch = question.type === "MATCHING";
    const isShort =
      !isOrder &&
      !isFill &&
      !isDiagram &&
      !isMatch &&
      question.options.length === 0;
    const canSubmit = isFill || isDiagram
      ? blanks.some((b) => b.trim().length > 0)
      : isMatch
      ? matches.some((m) => m)
      : isShort
      ? text.trim().length > 0
      : isOrder
      ? ordered.length > 0
      : selected !== "";
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-ink/60">
          <span>
            السؤال {question.index} من {question.total}
          </span>
          {remaining != null && (
            <span
              className={`rounded-lg px-2 py-1 font-medium ${
                remaining <= 30 ? "bg-red-100 text-red-700" : "bg-ink/5 text-ink/70"
              }`}
            >
              ⏱ {mmss(remaining)}
            </span>
          )}
        </div>

        <div className="card p-6">
          {!isFill && (
            <p className="mb-5 text-lg font-medium leading-relaxed">
              <MathText text={question.content} />
            </p>
          )}

          {isDiagram ? (
            <div className="space-y-3">
              {question.imageId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/attachments/${question.imageId}`}
                  alt="رسم السؤال"
                  className="max-h-[28rem] w-full rounded-xl border border-line object-contain"
                />
              )}
              <p className="text-sm text-ink/60">
                املأ الفراغات المرقّمة حسب الأسهم في الرسم:
              </p>
              <div className="space-y-2">
                {blanks.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-7 shrink-0 text-center text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={b}
                      disabled={startedFeedback}
                      onChange={(e) =>
                        setBlanks((prev) => {
                          const next = [...prev];
                          next[i] = e.target.value;
                          return next;
                        })
                      }
                      placeholder={`التسمية ${i + 1}`}
                      className="field flex-1"
                      aria-label={`التسمية ${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : isFill ? (
            <div className="text-lg leading-loose">
              {splitFillTemplate(question.content).map((part, i, arr) => (
                <span key={i}>
                  <span className="font-medium">{part}</span>
                  {i < arr.length - 1 && (
                    <input
                      type="text"
                      value={blanks[i] ?? ""}
                      disabled={startedFeedback}
                      onChange={(e) =>
                        setBlanks((prev) => {
                          const next = [...prev];
                          next[i] = e.target.value;
                          return next;
                        })
                      }
                      placeholder={`${i + 1}`}
                      className="mx-1 inline-block w-32 rounded-lg border border-line bg-surface px-2 py-1 text-center text-base align-middle focus:border-primary focus:outline-none"
                      aria-label={`الفراغ ${i + 1}`}
                    />
                  )}
                </span>
              ))}
            </div>
          ) : isOrder ? (
            <div className="space-y-2">
              <p className="mb-1 text-sm text-ink/60">
                رتّب العناصر بالترتيب الصحيح (استخدم الأسهم):
              </p>
              {ordered.map((o, i) => (
                <div
                  key={o.id}
                  className="flex items-center gap-2 rounded-xl border border-line p-3"
                >
                  <span className="w-6 text-center text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1">
                    <MathText text={o.content} />
                  </span>
                  {!startedFeedback && (
                    <span className="flex">
                      <button
                        type="button"
                        onClick={() => moveOrdered(i, -1)}
                        disabled={i === 0}
                        className="px-1.5 text-ink/40 hover:text-primary disabled:opacity-30"
                        aria-label="أعلى"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveOrdered(i, 1)}
                        disabled={i === ordered.length - 1}
                        className="px-1.5 text-ink/40 hover:text-primary disabled:opacity-30"
                        aria-label="أسفل"
                      >
                        ↓
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : isMatch ? (
            <div className="space-y-2">
              <p className="mb-1 text-sm text-ink/60">
                طابِق كل عنصر بما يناسبه:
              </p>
              {question.matchLefts?.map((left, i) => (
                <div
                  key={left.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-3"
                >
                  <span className="min-w-[6rem] flex-1 font-medium">
                    {left.text}
                  </span>
                  <span className="text-ink/40">←</span>
                  <select
                    value={matches[i] ?? ""}
                    disabled={startedFeedback}
                    onChange={(e) =>
                      setMatches((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    className="field w-48"
                  >
                    <option value="">— اختر —</option>
                    {question.matchRights?.map((r, k) => (
                      <option key={k} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ) : isShort ? (
            question.type === "ESSAY" ? (
              <textarea
                value={text}
                disabled={startedFeedback}
                onChange={(e) => setText(e.target.value)}
                placeholder="اكتب إجابتك المقالية هنا…"
                className="field min-h-[140px]"
              />
            ) : question.type === "CALCULATION" ? (
              // إدخال رياضيّ بلوحة المعادلات (يُخزَّن LaTeX مغلّفاً بـ $…$).
              <MathAnswerInput
                value={text}
                onChange={setText}
                disabled={startedFeedback}
              />
            ) : (
              <input
                type="text"
                value={text}
                disabled={startedFeedback}
                onChange={(e) => setText(e.target.value)}
                placeholder="اكتب إجابتك هنا…"
                className="field"
              />
            )
          ) : (
            <div className="space-y-2">
              {question.options.map((o) => (
                <label
                  key={o.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    selected === o.id
                      ? "border-primary bg-primary-light"
                      : "border-line hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="opt"
                    value={o.id}
                    checked={selected === o.id}
                    disabled={startedFeedback}
                    onChange={() => setSelected(o.id)}
                    className="accent-primary"
                  />
                  {o.label !== o.content && (
                    <span className="font-medium text-ink/80">{o.label}.</span>
                  )}
                  <span>
                    <MathText text={o.content} />
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {!startedFeedback && (
          <div className="space-y-2">
            {skipNote && (
              <p className="rounded-xl bg-gold/15 p-3 text-sm text-gold">
                {skipNote}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={submit}
                disabled={!canSubmit}
                className="btn-primary"
              >
                إرسال الإجابة
              </button>
              <button
                onClick={skip}
                type="button"
                className="rounded-xl border border-line px-5 py-3 font-medium hover:bg-ink/5"
              >
                تخطٍّ مؤقّت
              </button>
            </div>
            <p className="text-xs text-ink/50">
              التخطّي ينقلك للسؤال التالي، وتعود للأسئلة المتخطّاة في آخر الاختبار.
            </p>
            <div className="pt-1 text-left">
              <ReportButton
                key={question.nodeId}
                sessionId={sessionId}
                nodeId={question.nodeId}
              />
            </div>
          </div>
        )}

        {startedFeedback && reveal && (
          <FeedbackCard
            reveal={reveal}
            gender={gender}
            isLast={pendingFinish}
            onNext={goNext}
          />
        )}
      </div>
    );
  }

  return null;
}

// زرّ «الإبلاغ عن خطأ» — حالته الخاصّة، يُعاد تركيبه لكل سؤال (key=nodeId).
function ReportButton({
  sessionId,
  nodeId,
}: {
  sessionId: string;
  nodeId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function send() {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/student/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, nodeId, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "تعذّر الإرسال.");
      return;
    }
    setDone(true);
    setOpen(false);
  }

  if (done) {
    return (
      <p className="text-xs text-primary-dark">
        شكراً، تمّ إبلاغ المدرّس بملاحظتك.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-ink/50 transition hover:text-red-600 hover:underline"
      >
        🚩 الإبلاغ عن خطأ في السؤال
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-line p-3 text-right">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="صف الخطأ (خيار غير صحيح، صياغة غامضة، معلومة خاطئة…)"
        className="field min-h-[64px] text-sm"
      />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="flex gap-2">
        <button
          onClick={send}
          disabled={busy || reason.trim().length < 3}
          className="btn-primary px-3 py-1 text-sm"
        >
          إرسال البلاغ
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-ink/60 hover:underline"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

function FeedbackCard({
  reveal,
  gender,
  isLast,
  onNext,
}: {
  reveal: Reveal;
  gender: Gender;
  isLast: boolean;
  onNext: () => void;
}) {
  const praise = gender === "FEMALE" ? "أحسنتِ" : "أحسنتَ";

  // إجابة تخضع لمراجعة المدرّس (قصيرة/مقالية).
  if (reveal.needsReview) {
    return (
      <div className="card border-r-4 border-r-gold p-5">
        <p className="font-display text-lg font-bold text-gold">
          تمّ استلام إجابتك
        </p>
        <p className="mt-1 text-sm text-ink/70">
          يراجعها المدرّس ويعتمد الدرجة لاحقاً.
        </p>
        <button onClick={onNext} className="btn-primary mt-4">
          {isLast ? "عرض النتيجة" : "السؤال التالي"}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`card border-r-4 p-5 ${
        reveal.isCorrect ? "border-r-primary" : "border-r-red-500"
      }`}
    >
      <p
        className={`font-display text-lg font-bold ${
          reveal.isCorrect ? "text-primary-dark" : "text-red-600"
        }`}
      >
        {reveal.isCorrect ? `${praise}! إجابة صحيحة` : "إجابة غير صحيحة"}
        <span className="mr-2 text-sm font-normal text-ink/50">
          ({reveal.scoreEarned} / {reveal.points})
        </span>
      </p>

      {!reveal.isCorrect && reveal.correctOptions.length > 0 && (
        <p className="mt-2 text-sm">
          الإجابة الصحيحة:{" "}
          <span className="font-medium">
            {reveal.correctOptions.map((o, i) => (
              <span key={i}>
                {i > 0 && "، "}
                <MathText text={o.content} />
              </span>
            ))}
          </span>
        </p>
      )}
      {!reveal.isCorrect && reveal.acceptedAnswers.length > 0 && (
        <p className="mt-2 text-sm">
          الإجابة النموذجية:{" "}
          <span className="font-medium">
            <MathText text={reveal.acceptedAnswers[0]} />
          </span>
        </p>
      )}
      {reveal.explanation && (
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          <MathText text={reveal.explanation} />
        </p>
      )}

      <button onClick={onNext} className="btn-primary mt-4">
        {isLast ? "عرض النتيجة" : "السؤال التالي"}
      </button>
    </div>
  );
}

function ResultView({ result }: { result: ResultData }) {
  const pct = result.percentage;
  const tone = pct >= 50 ? "text-primary-dark" : "text-red-600";
  const pending = result.items.some((it) => it.needsReview);
  return (
    <div className="space-y-5">
      <div className="card p-6 text-center">
        <p className="text-ink/60">«{result.quizTitle}»</p>
        {pending ? (
          <>
            <p className="my-3 font-display text-2xl font-bold text-gold">
              تمّ تسليم إجاباتك ✓
            </p>
            <p className="text-sm leading-relaxed text-ink/70">
              يحتوي اختبارك أسئلة تحتاج تصحيح المدرّس.{" "}
              <span className="font-bold">نتيجتك غير نهائية</span> وستظهر بعد
              اعتماد المدرّس للتصحيح. لا داعي للقلق.
            </p>
          </>
        ) : (
          <>
            <p className="text-ink/60">نتيجتك</p>
            <p className={`my-2 font-display text-5xl font-bold ${tone}`}>
              {pct}%
            </p>
            <p className="text-sm text-ink/60">
              {result.totalScore} من {result.maxPossibleScore} نقطة
              {result.status === "TIMED_OUT" && " · انتهى الوقت"}
            </p>
          </>
        )}
      </div>

      {!pending && result.quizId && (
        <div className="flex flex-wrap gap-2 print:hidden">
          <PrintButton />
          <StudentArchiveToggle
            quizId={result.quizId}
            archived={result.archived ?? false}
          />
        </div>
      )}

      {result.sessionId && result.appealable && (
        <div className="card p-5 print:hidden">
          <h3 className="mb-2 font-display font-semibold">
            اعتراض على التصحيح
          </h3>
          <AppealBox
            sessionId={result.sessionId}
            appealable={result.appealable}
            appeal={result.appeal ?? null}
          />
        </div>
      )}

      <h3 className="font-display text-lg font-bold">المراجعة</h3>
      <div className="space-y-3">
        {result.items.map((it) => (
          <div
            key={it.index}
            className={`card border-r-4 p-4 ${
              it.isCancelled
                ? "border-r-ink/20 opacity-70"
                : it.needsReview
                ? "border-r-gold"
                : it.isCorrect
                ? "border-r-primary"
                : "border-r-red-500"
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="font-medium leading-relaxed">
                {it.index}. <MathText text={it.content} />
              </p>
              {it.isCancelled ? (
                <span className="shrink-0 rounded-full bg-ink/10 px-2 py-0.5 text-xs font-medium text-ink/50">
                  مُلغى — لا يُحتسب
                </span>
              ) : it.needsReview ? (
                <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
                  بانتظار التصحيح
                </span>
              ) : (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    it.isCorrect
                      ? "bg-primary text-white"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {it.isCorrect ? "صحيحة" : "خاطئة"}
                </span>
              )}
            </div>

            {it.options.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {it.options.map((o) => (
                  <li
                    key={o.id}
                    className={`rounded-lg px-2 py-1 ${
                      o.isCorrect
                        ? "bg-primary-light text-primary-dark"
                        : o.selected
                        ? "bg-red-50 text-red-700"
                        : "text-ink/70"
                    }`}
                  >
                    {o.label !== o.content && `${o.label}. `}
                    <MathText text={o.content} />
                    {o.isCorrect && " ✓"}
                    {o.selected && !o.isCorrect && " — إجابتك"}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm">
                <p>
                  إجابتك:{" "}
                  <span className={it.isCorrect ? "text-primary-dark" : "text-red-600"}>
                    {it.textAnswer ? <MathText text={it.textAnswer} /> : "—"}
                  </span>
                </p>
                {!it.isCorrect && it.acceptedAnswers.length > 0 && (
                  <p className="text-ink/70">
                    النموذجية: <MathText text={it.acceptedAnswers[0]} />
                  </p>
                )}
              </div>
            )}

            {it.explanation && (
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                <MathText text={it.explanation} />
              </p>
            )}
          </div>
        ))}
      </div>

      <Link href="/student/quizzes" className="btn-primary print:hidden">
        العودة لاختباراتي
      </Link>
    </div>
  );
}
