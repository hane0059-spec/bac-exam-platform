"use client";
// src/components/teacher/QuizGeneratorForm.tsx
// نموذج التوليد التلقائي: مادة + نطاق منهج + عدد كل نوع سؤال (إلزامي) + درجة
// كلية + عدد النماذج، مع معاينة حيّة لعدد الأسئلة المتاحة لكل نوع ضمن النطاق.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "ESSAY",
  "MATCHING",
  "FILL_BLANK",
  "DIAGRAM_LABEL",
  "CALCULATION",
  "ORDER",
] as const;
type QType = (typeof QUESTION_TYPES)[number];

const TYPE_LABEL: Record<QType, string> = {
  MULTIPLE_CHOICE: "اختيار من متعدّد",
  TRUE_FALSE: "صح/خطأ",
  SHORT_ANSWER: "إجابة قصيرة",
  ESSAY: "مقالي",
  ORDER: "ترتيب",
  FILL_BLANK: "ملء فراغات",
  MATCHING: "مطابقة",
  CALCULATION: "حساب",
  DIAGRAM_LABEL: "توسيم رسم",
};

interface Concept {
  id: string;
  title: string;
}
interface Chapter {
  id: string;
  title: string;
  concepts: Concept[];
}
interface Unit {
  id: string;
  title: string;
  chapters: Chapter[];
}
interface Subject {
  id: string;
  name: string;
  units: Unit[];
}

type ScopeLevel = "all" | "unit" | "chapter" | "concept";

export default function QuizGeneratorForm({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];

  const [scopeLevel, setScopeLevel] = useState<ScopeLevel>("all");
  const [unitId, setUnitId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [conceptId, setConceptId] = useState("");

  const chaptersInScope: Chapter[] = useMemo(() => {
    if (!subject) return [];
    if (unitId) return subject.units.find((u) => u.id === unitId)?.chapters ?? [];
    return subject.units.flatMap((u) => u.chapters);
  }, [subject, unitId]);
  const conceptsInScope: Concept[] = useMemo(() => {
    if (chapterId) return chaptersInScope.find((c) => c.id === chapterId)?.concepts ?? [];
    return chaptersInScope.flatMap((c) => c.concepts);
  }, [chaptersInScope, chapterId]);

  const scope =
    scopeLevel === "unit" && unitId
      ? { unitId }
      : scopeLevel === "chapter" && chapterId
        ? { chapterId }
        : scopeLevel === "concept" && conceptId
          ? { conceptId }
          : null;

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [countsLoading, setCountsLoading] = useState(false);

  useEffect(() => {
    if (!subjectId) return;
    setCountsLoading(true);
    const ctrl = new AbortController();
    fetch("/api/teacher/quizzes/generate/counts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, scope }),
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d) => setCounts(d.counts ?? {}))
      .catch(() => {})
      .finally(() => setCountsLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, scopeLevel, unitId, chapterId, conceptId]);

  const [reqCounts, setReqCounts] = useState<Record<QType, number>>(
    Object.fromEntries(QUESTION_TYPES.map((t) => [t, 0])) as Record<QType, number>
  );
  const totalQuestions = QUESTION_TYPES.reduce((s, t) => s + (reqCounts[t] || 0), 0);

  const [title, setTitle] = useState("");
  const [targetTotal, setTargetTotal] = useState(100);
  const [modelsCount, setModelsCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: string; title: string }[] | null>(null);

  async function submit() {
    setError("");
    setResult(null);
    const requirements = QUESTION_TYPES.filter((t) => reqCounts[t] > 0).map((t) => ({
      type: t,
      count: reqCounts[t],
    }));
    if (requirements.length === 0) {
      setError("أدخل عدداً لنوع سؤال واحد على الأقلّ.");
      return;
    }
    if (!title.trim()) {
      setError("عنوان الاختبار مطلوب.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/teacher/quizzes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subjectId,
        scope,
        title: title.trim(),
        targetTotal,
        modelsCount,
        requirements,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر التوليد.");
      return;
    }
    setResult(data.quizzes);
    router.refresh();
  }

  if (result) {
    return (
      <div className="card space-y-4 p-6">
        <p className="font-display font-semibold text-primary-dark">
          تمّ توليد {result.length === 1 ? "الاختبار" : `${result.length} نماذج`} ✓
          {result.length > 1 ? " كمسوّدات" : " كمسوّدة"} — راجعها وعدّلها قبل النشر.
        </p>
        <ul className="space-y-2">
          {result.map((q) => (
            <li
              key={q.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-line p-3"
            >
              <span className="text-sm font-medium">{q.title}</span>
              <a
                href={`/teacher/quizzes/${q.id}/edit`}
                className="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-light"
              >
                مراجعة وتعديل ←
              </a>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setResult(null)}
            className="rounded-xl border border-line px-4 py-2 text-sm hover:bg-ink/5"
          >
            توليد دفعة أخرى
          </button>
          <a href="/teacher/quizzes" className="btn-primary">
            اختباراتي
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-3 p-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium">المادة</label>
          <select
            className="field"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setUnitId("");
              setChapterId("");
              setConceptId("");
              setScopeLevel("all");
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
          <label className="mb-1.5 block text-sm font-medium">عنوان الاختبار</label>
          <input
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: اختبار الوحدة الأولى"
          />
          <p className="mt-1 text-xs text-ink/45">
            عند توليد أكثر من نموذج يُضاف «— نموذج 1»، «— نموذج 2»... تلقائياً.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">نطاق المنهج</label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "كلّ بنك المادة"],
                ["unit", "وحدة"],
                ["chapter", "فصل"],
                ["concept", "درس"],
              ] as [ScopeLevel, string][]
            ).map(([lvl, label]) => (
              <button
                key={lvl}
                type="button"
                onClick={() => {
                  setScopeLevel(lvl);
                  if (lvl === "all") {
                    setUnitId("");
                    setChapterId("");
                    setConceptId("");
                  }
                }}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  scopeLevel === lvl
                    ? "border-primary bg-primary-light font-medium text-primary-dark"
                    : "border-line text-ink/60 hover:bg-ink/5"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {scopeLevel === "unit" && (
            <select
              className="field mt-2"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
            >
              <option value="">اختر الوحدة</option>
              {subject?.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title}
                </option>
              ))}
            </select>
          )}
          {scopeLevel === "chapter" && (
            <select
              className="field mt-2"
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
            >
              <option value="">اختر الفصل</option>
              {(subject?.units.flatMap((u) => u.chapters) ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}
          {scopeLevel === "concept" && (
            <select
              className="field mt-2"
              value={conceptId}
              onChange={(e) => setConceptId(e.target.value)}
            >
              <option value="">اختر الدرس</option>
              {(subject?.units.flatMap((u) => u.chapters.flatMap((c) => c.concepts)) ?? []).map(
                (l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                )
              )}
            </select>
          )}
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <h3 className="font-display font-semibold">عدد كل نوع سؤال (إلزامي)</h3>
        <p className="text-xs text-ink/50">
          {countsLoading ? "جارٍ تحديث المتاح…" : "الرقم بين قوسين = المتاح فعلياً ضمن النطاق."}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {QUESTION_TYPES.map((t) => {
            const avail = counts[t] ?? 0;
            const val = reqCounts[t];
            const over = val > avail;
            return (
              <div
                key={t}
                className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 ${
                  over ? "border-red-300 bg-red-50" : "border-line"
                }`}
              >
                <span className="text-sm">
                  {TYPE_LABEL[t]} <span className="text-xs text-ink/45">({avail})</span>
                </span>
                <input
                  type="number"
                  min={0}
                  max={avail}
                  className="field w-20 px-2 py-1 text-sm"
                  value={val || ""}
                  onChange={(e) =>
                    setReqCounts((prev) => ({
                      ...prev,
                      [t]: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
        <p className="text-sm text-ink/60">إجمالي الأسئلة: {totalQuestions}</p>
      </div>

      <div className="card space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">الدرجة الكلية</label>
            <input
              type="number"
              min={1}
              step={0.25}
              className="field"
              value={targetTotal}
              onChange={(e) => setTargetTotal(Number(e.target.value) || 0)}
            />
            <p className="mt-1 text-xs text-ink/45">
              تُوزَّع تناسبياً حسب درجة كل سؤال الأصلية، بمجموع مطابق تماماً لهذا الرقم.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">عدد النماذج</label>
            <input
              type="number"
              min={1}
              max={7}
              className="field"
              value={modelsCount}
              onChange={(e) =>
                setModelsCount(Math.min(7, Math.max(1, Number(e.target.value) || 1)))
              }
            />
            <p className="mt-1 text-xs text-ink/45">حتى 7 نماذج غير متطابقة دفعة واحدة.</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={busy || totalQuestions === 0}
        className="btn-primary disabled:opacity-50"
      >
        {busy ? "جارٍ التوليد…" : "توليد"}
      </button>
    </div>
  );
}
