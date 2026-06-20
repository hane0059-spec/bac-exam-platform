"use client";
// src/components/teacher/QuestionForm.tsx
// نموذج إنشاء/تعديل سؤال: اختيار من متعدد / صح-خطأ / إجابة قصيرة.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { countBlanks } from "@/lib/grading";

type QType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "ESSAY"
  | "ORDER"
  | "FILL_BLANK";

interface Concept {
  id: string;
  title: string;
}
interface Chapter {
  id: string;
  title: string;
  concepts: Concept[];
}
export interface SubjectOption {
  id: string;
  name: string;
  chapters: Chapter[];
}
export interface QuestionInitial {
  type: QType;
  subjectId: string;
  chapterId: string | null;
  conceptId: string | null;
  content: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
  points: number;
  explanation: string;
  tags: string[];
  acceptedAnswers: string[];
  options: { content: string; isCorrect: boolean }[];
  used: boolean;
}

const DIFFICULTIES = [
  { v: "EASY", label: "سهل" },
  { v: "MEDIUM", label: "متوسط" },
  { v: "HARD", label: "صعب" },
  { v: "EXPERT", label: "متقدّم" },
] as const;

const TF_OPTIONS = ["صح", "خطأ"];

function emptyMcq() {
  return [
    { content: "", isCorrect: true },
    { content: "", isCorrect: false },
  ];
}

export default function QuestionForm({
  mode,
  questionId,
  subjects,
  initial,
}: {
  mode: "create" | "edit";
  questionId?: string;
  subjects: SubjectOption[];
  initial?: QuestionInitial;
}) {
  const router = useRouter();
  const locked = mode === "edit" && initial?.used === true;

  const [type, setType] = useState<QType>(initial?.type ?? "MULTIPLE_CHOICE");
  const [subjectId, setSubjectId] = useState(
    initial?.subjectId ?? subjects[0]?.id ?? ""
  );
  const [chapterId, setChapterId] = useState(initial?.chapterId ?? "");
  const [conceptId, setConceptId] = useState(initial?.conceptId ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "MEDIUM");
  const [points, setPoints] = useState(initial?.points ?? 1);
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [tags, setTags] = useState(initial?.tags.join("، ") ?? "");

  const [options, setOptions] = useState<{ content: string; isCorrect: boolean }[]>(
    initial && initial.type !== "SHORT_ANSWER" && initial.options.length
      ? initial.options
      : emptyMcq()
  );
  const [tfCorrect, setTfCorrect] = useState(
    initial?.type === "TRUE_FALSE"
      ? initial.options.findIndex((o) => o.isCorrect)
      : 0
  );
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>(
    initial?.acceptedAnswers.length ? initial.acceptedAnswers : [""]
  );
  // ملء الفراغات: لكل فراغ سلسلةُ إجاباته المقبولة مفصولةً بـ | (مخزّنة كـ option.content).
  const [fillBlanks, setFillBlanks] = useState<string[]>(
    initial?.type === "FILL_BLANK"
      ? initial.options.map((o) => o.content)
      : []
  );

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const subject = useMemo(
    () => subjects.find((s) => s.id === subjectId),
    [subjects, subjectId]
  );
  const chapters = subject?.chapters ?? [];
  const concepts = chapters.find((c) => c.id === chapterId)?.concepts ?? [];

  const maxOptions = type === "ORDER" ? 8 : 6;
  // عدد الفراغات مُشتقّ من علامات [[ ]] في نصّ السؤال.
  const blankCount = useMemo(() => countBlanks(content), [content]);

  function setCorrect(idx: number) {
    setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === idx })));
  }
  function setOptionText(idx: number, text: string) {
    setOptions((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, content: text } : o))
    );
  }
  function addOption() {
    if (options.length >= maxOptions) return;
    setOptions((prev) => [...prev, { content: "", isCorrect: false }]);
  }
  // إعادة ترتيب العنصر (لسؤال الترتيب: الترتيب المعروض = الترتيب الصحيح).
  function moveOption(idx: number, dir: -1 | 1) {
    setOptions((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const a = [...prev];
      [a[idx], a[j]] = [a[j], a[idx]];
      return a;
    });
  }
  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (!next.some((o) => o.isCorrect)) next[0].isCorrect = true;
      return next;
    });
  }

  function buildPayload() {
    const base = {
      type,
      subjectId,
      chapterId: chapterId || null,
      conceptId: conceptId || null,
      content,
      difficulty,
      points: Number(points),
      explanation,
      tags: tags
        .split(/[،,]/)
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (type === "ESSAY") {
      return { ...base, acceptedAnswers: [], options: [] };
    }
    if (type === "SHORT_ANSWER") {
      return {
        ...base,
        acceptedAnswers: acceptedAnswers.map((a) => a.trim()).filter(Boolean),
        options: [],
      };
    }
    if (type === "TRUE_FALSE") {
      return {
        ...base,
        acceptedAnswers: [],
        options: TF_OPTIONS.map((c, i) => ({
          content: c,
          isCorrect: i === tfCorrect,
        })),
      };
    }
    if (type === "ORDER") {
      // الترتيب المعروض هو الترتيب الصحيح؛ لا «إجابة صحيحة».
      return {
        ...base,
        acceptedAnswers: [],
        options: options.map((o) => ({ content: o.content, isCorrect: false })),
      };
    }
    if (type === "FILL_BLANK") {
      // خيارٌ لكل فراغ، محتواه إجاباته المقبولة (مفصولة بـ |) بترتيب الفراغات.
      return {
        ...base,
        acceptedAnswers: [],
        options: Array.from({ length: blankCount }, (_, i) => ({
          content: (fillBlanks[i] ?? "").trim(),
          isCorrect: false,
        })),
      };
    }
    return { ...base, acceptedAnswers: [], options };
  }

  async function submit() {
    setError("");
    setSubmitting(true);
    const url =
      mode === "create"
        ? "/api/teacher/questions"
        : `/api/teacher/questions/${questionId}`;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "تعذّر الحفظ.");
      return;
    }
    router.push("/teacher/questions");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {locked && (
        <div className="rounded-xl bg-gold/15 p-3 text-sm text-gold">
          هذا السؤال مُستخدَم في إجابات طلاب — يمكن تعديل النصّ والشرح والعلامة
          فقط، دون تغيير النوع أو الخيارات.
        </div>
      )}

      {/* النوع */}
      <div>
        <label className="mb-1 block text-sm font-medium">نوع السؤال</label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["MULTIPLE_CHOICE", "اختيار من متعدد"],
              ["TRUE_FALSE", "صح / خطأ"],
              ["SHORT_ANSWER", "إجابة قصيرة"],
              ["ESSAY", "مقالي"],
              ["ORDER", "ترتيب"],
              ["FILL_BLANK", "ملء الفراغات"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              disabled={locked}
              onClick={() => setType(v)}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                type === v
                  ? "border-primary bg-primary-light text-primary-dark"
                  : "border-line hover:border-primary/40"
              } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* المادة/الفصل/المفهوم */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">المادة</label>
          <select
            className="field"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setChapterId("");
              setConceptId("");
            }}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">الفصل (اختياري)</label>
          <select
            className="field"
            value={chapterId}
            onChange={(e) => {
              setChapterId(e.target.value);
              setConceptId("");
            }}
          >
            <option value="">—</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            المفهوم (اختياري)
          </label>
          <select
            className="field"
            value={conceptId}
            onChange={(e) => setConceptId(e.target.value)}
            disabled={!chapterId}
          >
            <option value="">—</option>
            {concepts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* نصّ السؤال */}
      <div>
        <label className="mb-1 block text-sm font-medium">نصّ السؤال</label>
        <textarea
          className="field min-h-[90px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="اكتب نصّ السؤال…"
        />
      </div>

      {/* الخيارات حسب النوع */}
      {type === "MULTIPLE_CHOICE" && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            الخيارات (اختر الإجابة الصحيحة)
          </label>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct"
                  checked={o.isCorrect}
                  disabled={locked}
                  onChange={() => setCorrect(i)}
                  className="accent-primary"
                  aria-label="الإجابة الصحيحة"
                />
                <input
                  type="text"
                  className="field flex-1"
                  value={o.content}
                  disabled={locked}
                  onChange={(e) => setOptionText(i, e.target.value)}
                  placeholder={`الخيار ${i + 1}`}
                />
                {options.length > 2 && !locked && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="px-2 text-ink/40 hover:text-red-500"
                    aria-label="حذف الخيار"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && !locked && (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-sm text-primary hover:underline"
            >
              + أضف خياراً
            </button>
          )}
        </div>
      )}

      {type === "ORDER" && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            العناصر بالترتيب الصحيح (يراها الطالب مخلوطةً فيرتّبها)
          </label>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm font-medium text-ink/50">
                  {i + 1}
                </span>
                <input
                  type="text"
                  className="field flex-1"
                  value={o.content}
                  disabled={locked}
                  onChange={(e) => setOptionText(i, e.target.value)}
                  placeholder={`العنصر ${i + 1}`}
                />
                {!locked && (
                  <span className="flex">
                    <button
                      type="button"
                      onClick={() => moveOption(i, -1)}
                      disabled={i === 0}
                      className="px-1.5 text-ink/40 hover:text-primary disabled:opacity-30"
                      aria-label="أعلى"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveOption(i, 1)}
                      disabled={i === options.length - 1}
                      className="px-1.5 text-ink/40 hover:text-primary disabled:opacity-30"
                      aria-label="أسفل"
                    >
                      ↓
                    </button>
                  </span>
                )}
                {options.length > 2 && !locked && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="px-2 text-ink/40 hover:text-red-500"
                    aria-label="حذف العنصر"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < maxOptions && !locked && (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-sm text-primary hover:underline"
            >
              + أضف عنصراً
            </button>
          )}
        </div>
      )}

      {type === "TRUE_FALSE" && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            الإجابة الصحيحة
          </label>
          <div className="flex gap-2">
            {TF_OPTIONS.map((c, i) => (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 ${
                  tfCorrect === i
                    ? "border-primary bg-primary-light"
                    : "border-line"
                } ${locked ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <input
                  type="radio"
                  name="tf"
                  checked={tfCorrect === i}
                  disabled={locked}
                  onChange={() => setTfCorrect(i)}
                  className="accent-primary"
                />
                {c}
              </label>
            ))}
          </div>
        </div>
      )}

      {type === "SHORT_ANSWER" && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            الإجابات المقبولة (تُصحَّح بتطبيع عربي ومطابقة دقيقة)
          </label>
          <div className="space-y-2">
            {acceptedAnswers.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  className="field flex-1"
                  value={a}
                  onChange={(e) =>
                    setAcceptedAnswers((prev) =>
                      prev.map((x, j) => (j === i ? e.target.value : x))
                    )
                  }
                  placeholder={`إجابة مقبولة ${i + 1}`}
                />
                {acceptedAnswers.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setAcceptedAnswers((prev) =>
                        prev.filter((_, j) => j !== i)
                      )
                    }
                    className="px-2 text-ink/40 hover:text-red-500"
                    aria-label="حذف الإجابة"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAcceptedAnswers((prev) => [...prev, ""])}
            className="mt-2 text-sm text-primary hover:underline"
          >
            + أضف إجابة مقبولة
          </button>
        </div>
      )}

      {type === "FILL_BLANK" && (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label className="block text-sm font-medium">
              إجابات الفراغات
            </label>
            {!locked && (
              <button
                type="button"
                onClick={() =>
                  setContent((c) => `${c}${c && !c.endsWith(" ") ? " " : ""}[[ ]]`)
                }
                className="text-sm text-primary hover:underline"
              >
                + إدراج فراغ في النصّ
              </button>
            )}
          </div>
          <p className="mb-3 rounded-xl bg-primary-light/60 p-3 text-xs leading-relaxed text-primary-dark">
            اكتب نصّ السؤال أعلاه وضع علامة{" "}
            <code className="rounded bg-ink/10 px-1">[[ ]]</code> مكان كل فراغ
            (أو اضغط «إدراج فراغ»). ثم أدخل أدناه الإجابات المقبولة لكل فراغ —
            افصل المترادفات بـ <code className="rounded bg-ink/10 px-1">|</code>.
            تُصحَّح بتطبيع عربي ومطابقة دقيقة، والدرجة جزئية لكل فراغ.
          </p>
          {blankCount === 0 ? (
            <p className="rounded-xl bg-gold/15 p-3 text-sm text-gold">
              لا فراغات بعد — أضف علامة <code>[[ ]]</code> واحدة على الأقل في
              نصّ السؤال.
            </p>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: blankCount }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-sm font-medium text-ink/50">
                    الفراغ {i + 1}
                  </span>
                  <input
                    type="text"
                    className="field flex-1"
                    value={fillBlanks[i] ?? ""}
                    disabled={locked}
                    onChange={(e) =>
                      setFillBlanks((prev) => {
                        const next = [...prev];
                        next[i] = e.target.value;
                        return next;
                      })
                    }
                    placeholder={`إجابات الفراغ ${i + 1} (مثال: نواة | النواة)`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* الصعوبة/العلامة */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">الصعوبة</label>
          <select
            className="field"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.v} value={d.v}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">العلامة</label>
          <input
            type="number"
            min={0.25}
            step={0.25}
            className="field"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
          />
        </div>
      </div>

      {/* الشرح/الوسوم */}
      <div>
        <label className="mb-1 block text-sm font-medium">الشرح (اختياري)</label>
        <textarea
          className="field min-h-[70px]"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="شرح يظهر للطالب بعد الإجابة…"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          وسوم (افصل بينها بفاصلة، اختياري)
        </label>
        <input
          type="text"
          className="field"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="مثال: كهرباء، تيار، أساسي"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="btn-primary"
        >
          {submitting ? "جارٍ الحفظ…" : mode === "create" ? "حفظ السؤال" : "حفظ التعديلات"}
        </button>
        <button
          onClick={() => router.push("/teacher/questions")}
          className="rounded-xl border border-line px-5 py-3 font-medium hover:bg-ink/5"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}
