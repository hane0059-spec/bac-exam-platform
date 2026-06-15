"use client";
// src/components/student/QuizRunner.tsx
// مُشغّل الاختبار للطالب: بدء/استئناف، عرض الأسئلة، تصحيح فوري، ثم النتيجة والمراجعة.
// لا يستقبل أي إجابة صحيحة قبل الإرسال؛ المؤقّت عرضيّ فقط والفرض على الخادم.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

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
}
interface Reveal {
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
  const submitting = useRef(false);

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
    const optionIds = selected ? [selected] : [];
    const res = await fetch(`/api/student/sessions/${sessionId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodeId: question.nodeId,
        optionIds,
        textAnswer: text,
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
    setReveal(data.reveal as Reveal);
    setPendingFinish(Boolean(data.finished));
    setNextQuestion((data.next as Question) ?? null);
    setPhase("feedback");
  }, [question, selected, text, sessionId, loadResult]);

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
    const isShort = question.options.length === 0;
    const canSubmit = isShort ? text.trim().length > 0 : selected !== "";
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
          <p className="mb-5 text-lg font-medium leading-relaxed">
            {question.content}
          </p>

          {isShort ? (
            <input
              type="text"
              value={text}
              disabled={startedFeedback}
              onChange={(e) => setText(e.target.value)}
              placeholder="اكتب إجابتك هنا…"
              className="field"
            />
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
                  <span>{o.content}</span>
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
            {reveal.correctOptions.map((o) => o.content).join("، ")}
          </span>
        </p>
      )}
      {!reveal.isCorrect && reveal.acceptedAnswers.length > 0 && (
        <p className="mt-2 text-sm">
          الإجابة النموذجية:{" "}
          <span className="font-medium">{reveal.acceptedAnswers[0]}</span>
        </p>
      )}
      {reveal.explanation && (
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          {reveal.explanation}
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
  const tone =
    pct >= 50 ? "text-primary-dark" : "text-red-600";
  return (
    <div className="space-y-5">
      <div className="card p-6 text-center">
        <p className="text-ink/60">نتيجتك في «{result.quizTitle}»</p>
        <p className={`my-2 font-display text-5xl font-bold ${tone}`}>{pct}%</p>
        <p className="text-sm text-ink/60">
          {result.totalScore} من {result.maxPossibleScore} نقطة
          {result.status === "TIMED_OUT" && " · انتهى الوقت"}
        </p>
      </div>

      <h3 className="font-display text-lg font-bold">المراجعة</h3>
      <div className="space-y-3">
        {result.items.map((it) => (
          <div
            key={it.index}
            className={`card border-r-4 p-4 ${
              it.isCorrect ? "border-r-primary" : "border-r-red-500"
            }`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="font-medium leading-relaxed">
                {it.index}. {it.content}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  it.isCorrect
                    ? "bg-primary text-white"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {it.isCorrect ? "صحيحة" : "خاطئة"}
              </span>
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
                    {o.content}
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
                    {it.textAnswer || "—"}
                  </span>
                </p>
                {!it.isCorrect && it.acceptedAnswers.length > 0 && (
                  <p className="text-ink/70">
                    النموذجية: {it.acceptedAnswers[0]}
                  </p>
                )}
              </div>
            )}

            {it.explanation && (
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                {it.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      <Link href="/student/quizzes" className="btn-primary">
        العودة لاختباراتي
      </Link>
    </div>
  );
}
