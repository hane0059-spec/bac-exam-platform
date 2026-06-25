"use client";
// src/components/teacher/QuizBuilder.tsx
// باني الاختبار: بيانات + إعدادات + نافذة توقيت + اختيار/ترتيب أسئلة + تجاوز علامة + نشر.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MathText from "@/components/MathText";
import DateTimeField from "@/components/DateTimeField";
import ConfirmButton from "@/components/ConfirmButton";
import QuestionForm, {
  type SubjectOption,
} from "@/components/teacher/QuestionForm";
import type { CustomKeyboard } from "@/components/math/symbolBank";

type QType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";

interface BankQuestion {
  id: string;
  content: string;
  type: QType;
  points: number;
  difficulty: string;
  inBank: boolean;
  chapterId: string | null;
  chapterTitle: string | null;
  tags: string[];
}
interface Item {
  questionId: string;
  pointsOverride: number | null;
}
export interface QuizBuilderInitial {
  title: string;
  description: string;
  timeLimitSec: number | null;
  maxAttempts: number;
  revealAnswers: "immediate" | "end";
  shuffle: boolean;
  availableFrom: string | null;
  availableUntil: string | null;
  accessCode: string | null;
  allowCodeJoin: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "اختيار",
  TRUE_FALSE: "صح/خطأ",
  SHORT_ANSWER: "قصيرة",
  ESSAY: "مقالي",
  ORDER: "ترتيب",
  FILL_BLANK: "ملء فراغات",
  MATCHING: "مطابقة",
  CALCULATION: "حساب",
  DIAGRAM_LABEL: "توسيم رسم",
};

function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function localToIso(local: string): string | null {
  return local ? new Date(local).toISOString() : null;
}

export default function QuizBuilder({
  quizId,
  status,
  purged = false,
  canEditStructure,
  bank,
  subjectTree = [],
  customKeyboard,
  initialItems,
  initial,
}: {
  quizId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  purged?: boolean;
  canEditStructure: boolean;
  bank: BankQuestion[];
  subjectTree?: SubjectOption[];
  customKeyboard?: CustomKeyboard;
  initialItems: Item[];
  initial: QuizBuilderInitial;
}) {
  const router = useRouter();
  const ro = !canEditStructure; // بنية مقفلة

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [codeJoin, setCodeJoin] = useState(initial.allowCodeJoin);
  const [noLimit, setNoLimit] = useState(initial.timeLimitSec === null);
  const [minutes, setMinutes] = useState(
    initial.timeLimitSec ? Math.round(initial.timeLimitSec / 60) : 10
  );
  const [maxAttempts, setMaxAttempts] = useState(initial.maxAttempts);
  const [reveal, setReveal] = useState(initial.revealAnswers);
  const [shuffle, setShuffle] = useState(initial.shuffle);
  const [from, setFrom] = useState(isoToLocal(initial.availableFrom));
  const [until, setUntil] = useState(isoToLocal(initial.availableUntil));
  const [items, setItems] = useState<Item[]>(initialItems);
  // قائمة الأسئلة المعروفة (البنك + المؤلَّفة فورياً)؛ تتغيّر عند الإنشاء/الترقية.
  const [questions, setQuestions] = useState<BankQuestion[]>(bank);
  const [showNew, setShowNew] = useState(false);
  // إعادة تركيب نموذج التأليف الفوريّ بعد كل إنشاء + رسالة التأكيد.
  const [newKey, setNewKey] = useState(0);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  // الفصول المفتوحة في تبويب البنك (أكورديون).
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
  function toggleChapter(key: string) {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const bankMap = useMemo(
    () => new Map(questions.map((q) => [q.id, q])),
    [questions]
  );

  // فلترة بنك الأسئلة (لأنّه قد يعرض كل أسئلة المادة): بالفصل وبالبحث النصّي.
  const [bankChapter, setBankChapter] = useState("");
  const [bankSearch, setBankSearch] = useState("");
  const chapters = useMemo(() => {
    const m = new Map<string, string>();
    for (const q of questions)
      if (q.inBank && q.chapterId && q.chapterTitle)
        m.set(q.chapterId, q.chapterTitle);
    return [...m.entries()].map(([id, title]) => ({ id, title }));
  }, [questions]);
  const hasNoChapter = useMemo(
    () => questions.some((q) => q.inBank && !q.chapterId),
    [questions]
  );

  // قائمة الاختيار = أسئلة البنك فقط (لا الفوريّة) غير المضافة بعد.
  const available = questions.filter((q) => {
    if (!q.inBank) return false;
    if (items.some((it) => it.questionId === q.id)) return false;
    if (bankChapter === "__none__" && q.chapterId) return false;
    if (bankChapter && bankChapter !== "__none__" && q.chapterId !== bankChapter)
      return false;
    const s = bankSearch.trim();
    if (s && !q.content.includes(s) && !q.tags.some((t) => t.includes(s))) return false;
    return true;
  });

  // عند البحث: نتائج مسطّحة. وإلّا: تبويب حسب الفصل (أكورديون) لتفادي عرض الكلّ دفعةً.
  const searching = bankSearch.trim() !== "";
  const availableGroups = (() => {
    const m = new Map<string, { title: string; items: BankQuestion[] }>();
    for (const q of available) {
      const key = q.chapterId ?? "__none__";
      if (!m.has(key))
        m.set(key, { title: q.chapterTitle ?? "بلا فصل", items: [] });
      m.get(key)!.items.push(q);
    }
    return [...m.entries()].map(([key, v]) => ({ key, ...v }));
  })();

  const totalPoints = items.reduce((sum, it) => {
    const q = bankMap.get(it.questionId);
    return sum + (it.pointsOverride ?? q?.points ?? 0);
  }, 0);

  function move(idx: number, dir: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }
  function remove(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }
  function add(id: string) {
    setItems((prev) => [...prev, { questionId: id, pointsOverride: null }]);
  }
  // التأليف الفوريّ: سؤال أُنشئ خارج البنك يُضاف للاختبار مباشرةً.
  function onCreated(q: {
    id: string;
    content: string;
    type: string;
    points: number;
  }) {
    setQuestions((prev) => [
      ...prev,
      {
        id: q.id,
        content: q.content,
        type: q.type as QType,
        points: q.points,
        difficulty: "MEDIUM",
        inBank: false,
        tags: [],
        chapterId: null,
        chapterTitle: null,
      },
    ]);
    setItems((prev) => [...prev, { questionId: q.id, pointsOverride: null }]);
    // أبقِ اللوحة مفتوحةً وأعِد تركيب النموذج (key) لتأليف سؤال آخر بسرعة.
    setLastAdded(q.content);
    setNewKey((k) => k + 1);
  }
  // ترقية سؤال فوريّ إلى بنك الأسئلة (يصير قابلاً لإعادة الاستخدام).
  async function promote(ids: string[]) {
    const targets = ids.filter((id) => bankMap.get(id)?.inBank === false);
    if (targets.length === 0) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/teacher/questions/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: targets }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّرت الإضافة للبنك.");
      return;
    }
    setQuestions((prev) =>
      prev.map((q) => (targets.includes(q.id) ? { ...q, inBank: true } : q))
    );
  }
  function setOverride(idx: number, value: string) {
    const num = value.trim() === "" ? null : Number(value);
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, pointsOverride: Number.isNaN(num as number) ? null : num }
          : it
      )
    );
  }

  async function save() {
    setError("");
    setSaved(false);
    setBusy(true);
    const res = await fetch(`/api/teacher/quizzes/${quizId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        allowCodeJoin: codeJoin,
        settings: {
          timeLimitSec: noLimit ? null : Math.max(1, Math.round(minutes * 60)),
          maxAttempts,
          revealAnswers: reveal,
          shuffle,
        },
        availableFrom: localToIso(from),
        availableUntil: localToIso(until),
        questions: items.map((it) => ({
          questionId: it.questionId,
          pointsOverride: it.pointsOverride,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر الحفظ.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function togglePublish() {
    setError("");
    setBusy(true);
    const action = status === "PUBLISHED" ? "unpublish" : "publish";
    const res = await fetch(`/api/teacher/quizzes/${quizId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر تغيير حالة النشر.");
      return;
    }
    router.refresh();
  }

  async function del() {
    setBusy(true);
    const res = await fetch(`/api/teacher/quizzes/${quizId}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) {
      router.push("/teacher/quizzes");
      router.refresh();
    } else setError("تعذّر الحذف.");
  }

  async function permanentDelete() {
    setBusy(true);
    const res = await fetch(`/api/teacher/quizzes/${quizId}?permanent=1`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) {
      router.push("/teacher/quizzes");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر الحذف النهائي.");
    }
  }

  async function restore() {
    setError("");
    setBusy(true);
    const res = await fetch(`/api/teacher/quizzes/${quizId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("تعذّر الاستعادة.");
  }

  return (
    <div className="space-y-5">
      {status === "ARCHIVED" ? (
        <div className="rounded-xl bg-gold/15 p-3 text-sm text-gold">
          {purged
            ? "حُذف محتوى هذا الاختبار (الأسئلة والمرفقات) نهائياً — تبقى درجات الطلاب محفوظةً للسجلّ فقط."
            : "هذا الاختبار مؤرشف: مخفيٌّ عن الطلاب، ونتائجه السابقة محفوظة. أعِده إلى المسوّدة لتعديله ونشره، أو احذفه نهائياً من الأرشيف."}
        </div>
      ) : (
        ro && (
          <div className="rounded-xl bg-gold/15 p-3 text-sm text-gold">
            {status === "PUBLISHED"
              ? "الاختبار منشور: يمكن تعديل العنوان والوصف ونافذة التوقيت فقط. لتغيير الأسئلة ألغِ النشر أولاً (قبل بدء أي طالب)."
              : "الاختبار مُستخدَم في جلسات: بنيته مقفلة حفاظاً على النتائج."}
          </div>
        )
      )}

      {/* بيانات أساسية */}
      <div className="card space-y-3 p-5">
        <div>
          <label className="mb-1 block text-sm font-medium">العنوان</label>
          <input
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">الوصف (اختياري)</label>
          <textarea
            className="field min-h-[60px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {/* الإعدادات */}
      <div className="card space-y-3 p-5">
        <h3 className="font-display font-semibold">الإعدادات</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">المهلة</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                className="field"
                value={minutes}
                disabled={ro || noLimit}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
              <span className="text-sm text-ink/60">دقيقة</span>
            </div>
            <label className="mt-1 flex items-center gap-1 text-xs text-ink/60">
              <input
                type="checkbox"
                checked={noLimit}
                disabled={ro}
                onChange={(e) => setNoLimit(e.target.checked)}
              />
              بلا مهلة
            </label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">المحاولات</label>
            <input
              type="number"
              min={1}
              max={10}
              className="field"
              value={maxAttempts}
              disabled={ro}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">كشف التصحيح</label>
            <select
              className="field"
              value={reveal}
              disabled={ro}
              onChange={(e) =>
                setReveal(e.target.value as "immediate" | "end")
              }
            >
              <option value="immediate">فوري بعد كل سؤال</option>
              <option value="end">في نهاية الاختبار</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 rounded-xl bg-gold/10 p-3 text-sm">
          <input
            type="checkbox"
            checked={shuffle}
            disabled={ro}
            onChange={(e) => setShuffle(e.target.checked)}
            className="accent-primary"
          />
          خلط ترتيب الأسئلة والخيارات لكل طالب (للنزاهة)
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              متاح من (اختياري)
            </label>
            <DateTimeField value={from} onChange={setFrom} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              متاح حتى (اختياري)
            </label>
            <DateTimeField value={until} onChange={setUntil} />
          </div>
        </div>
      </div>

      {/* الوصول بالرمز (قابل للتعديل دائماً) */}
      <div className="card space-y-2 p-5">
        <h3 className="font-display font-semibold">الوصول بالرمز</h3>
        {initial.accessCode ? (
          <p className="text-sm">
            رمز الاختبار:{" "}
            <span className="font-bold" dir="ltr">
              {initial.accessCode}
            </span>
          </p>
        ) : (
          <p className="text-sm text-ink/50">يُولَّد الرمز عند نشر الاختبار.</p>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={codeJoin}
            onChange={(e) => setCodeJoin(e.target.checked)}
            className="accent-primary"
          />
          السماح للطلاب بالانضمام عبر الرمز
        </label>
        <p className="text-xs text-ink/50">
          عند الإيقاف لا يعمل الرمز ويصل الطلاب عبر الإسناد فقط. فعّله للاختبارات
          المفتوحة وأغلقه متى شئت (يُحفظ بزرّ «حفظ»).
        </p>
      </div>

      {/* الأسئلة المختارة */}
      <div className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-semibold">
            أسئلة الاختبار ({items.length})
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {!ro &&
              items.some(
                (it) => bankMap.get(it.questionId)?.inBank === false
              ) && (
                <button
                  type="button"
                  onClick={() => promote(items.map((it) => it.questionId))}
                  disabled={busy}
                  className="rounded-lg border border-primary px-3 py-1 text-xs font-medium text-primary-dark hover:bg-primary-light disabled:opacity-50"
                >
                  ↑ أضف كل الأسئلة الجديدة للبنك
                </button>
              )}
            <span className="text-sm text-ink/60">
              المجموع: {totalPoints} نقطة
            </span>
          </div>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-ink/50">لم تَضِف أسئلة بعد.</p>
        ) : (
          <ol className="space-y-2">
            {items.map((it, idx) => {
              const q = bankMap.get(it.questionId);
              return (
                <li
                  key={it.questionId}
                  className="flex items-center gap-2 rounded-xl border border-line p-3"
                >
                  <span className="text-sm font-medium text-ink/50">
                    {idx + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {q?.content ?? "سؤال محذوف"}
                    </p>
                    <span className="text-xs text-ink/40">
                      {q ? TYPE_LABEL[q.type] : ""} • افتراضي {q?.points ?? 0}
                    </span>
                  </div>
                  {q && !q.inBank && (
                    <button
                      type="button"
                      onClick={() => promote([it.questionId])}
                      disabled={busy}
                      title="هذا السؤال خارج البنك — أضِفه ليُعاد استخدامه"
                      className="shrink-0 rounded-lg border border-gold/50 bg-gold/10 px-2 py-1 text-xs font-medium text-gold hover:bg-gold/20 disabled:opacity-50"
                    >
                      ↑ للبنك
                    </button>
                  )}
                  <input
                    type="number"
                    min={0.25}
                    step={0.25}
                    className="field w-20 px-2 py-1 text-sm"
                    placeholder={String(q?.points ?? "")}
                    value={it.pointsOverride ?? ""}
                    disabled={ro}
                    onChange={(e) => setOverride(idx, e.target.value)}
                    title="تجاوز العلامة (اتركه فارغاً للافتراضي)"
                  />
                  {!ro && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => move(idx, -1)}
                        className="px-1 text-ink/50 hover:text-ink"
                        aria-label="أعلى"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => move(idx, 1)}
                        className="px-1 text-ink/50 hover:text-ink"
                        aria-label="أسفل"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(idx)}
                        className="px-1 text-ink/40 hover:text-red-500"
                        aria-label="حذف"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* تأليف سؤال جديد فورياً (خارج البنك حتّى ترقيته) */}
      {!ro && subjectTree.length > 0 && (
        <div className="card space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-semibold">أو ألّف سؤالاً جديداً</h3>
            <button
              type="button"
              onClick={() => {
                setShowNew((v) => !v);
                setLastAdded(null);
              }}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                showNew
                  ? "border-primary bg-primary-light text-primary-dark"
                  : "border-primary text-primary-dark hover:bg-primary-light"
              }`}
            >
              {showNew ? "إغلاق" : "+ سؤال جديد"}
            </button>
          </div>
          {showNew && (
            <div className="rounded-xl border border-primary/30 bg-primary-light/20 p-4">
              {lastAdded && (
                <p className="mb-3 rounded-lg bg-primary-light p-2 text-sm text-primary-dark">
                  ✓ أُضيف «{lastAdded.slice(0, 40)}» للاختبار. ألّف سؤالاً آخر أو
                  أغلِق اللوحة.
                </p>
              )}
              <p className="mb-3 text-sm text-ink/60">
                يُضاف السؤال للاختبار مباشرةً ويبقى <b>خارج البنك</b> حتّى
                ترقيته. الترقية من زرّ «↑ للبنك» على السؤال.
              </p>
              <QuestionForm
                key={newKey}
                mode="create"
                subjects={subjectTree}
                customKeyboard={customKeyboard}
                inBank={false}
                onCreated={onCreated}
              />
            </div>
          )}
        </div>
      )}

      {/* إضافة من البنك */}
      {!ro && (
        <div className="card space-y-3 p-5">
          <h3 className="font-display font-semibold">أضف من بنك الأسئلة</h3>

          {/* فلترة البنك بالفصل والبحث */}
          {questions.some((q) => q.inBank) && (
            <div className="flex flex-wrap gap-2">
              {chapters.length > 0 && (
                <select
                  className="field w-auto flex-1"
                  value={bankChapter}
                  onChange={(e) => setBankChapter(e.target.value)}
                >
                  <option value="">كل الفصول</option>
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                  {hasNoChapter && <option value="__none__">بلا فصل</option>}
                </select>
              )}
              <input
                type="search"
                className="field flex-1"
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                placeholder="ابحث في نصّ السؤال أو الوسوم…"
              />
            </div>
          )}

          {available.length === 0 ? (
            <p className="text-sm text-ink/50">
              {!questions.some((q) => q.inBank)
                ? "لا أسئلة في البنك لهذه المادة. ألّف سؤالاً جديداً أعلاه أو أضِف للبنك."
                : "لا أسئلة مطابقة للفلترة."}
            </p>
          ) : searching ? (
            // نتائج بحث مسطّحة.
            <ul className="space-y-2">
              {available.map((q) => (
                <QRow key={q.id} q={q} onAdd={() => add(q.id)} />
              ))}
            </ul>
          ) : (
            // تبويب حسب الفصل (أكورديون): الفصل مطويّ حتّى تفتحه.
            <div className="space-y-2">
              {availableGroups.map((g) => {
                const open = openChapters.has(g.key);
                return (
                  <div
                    key={g.key}
                    className="overflow-hidden rounded-xl border border-line"
                  >
                    <button
                      type="button"
                      onClick={() => toggleChapter(g.key)}
                      className="flex w-full items-center justify-between gap-2 bg-ink/5 px-3 py-2 text-sm font-medium hover:bg-ink/10"
                    >
                      <span>
                        {open ? "▾" : "▸"} {g.title}
                      </span>
                      <span className="text-xs text-ink/50">
                        {g.items.length} سؤالاً
                      </span>
                    </button>
                    {open && (
                      <ul className="space-y-2 p-2">
                        {g.items.map((q) => (
                          <QRow key={q.id} q={q} onAdd={() => add(q.id)} />
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}
      {saved && !error && (
        <p className="rounded-xl bg-primary-light p-3 text-sm text-primary-dark">
          تم الحفظ.
        </p>
      )}

      {/* أزرار */}
      {status === "ARCHIVED" ? (
        purged ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/teacher/quizzes/${quizId}/results`}
              className="rounded-xl border border-primary px-5 py-3 text-sm font-medium text-primary hover:bg-primary-light"
            >
              عرض الدرجات المحفوظة ←
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={restore}
              disabled={busy}
              className="rounded-xl bg-primary px-5 py-3 font-medium text-white transition hover:opacity-90"
            >
              إعادة إلى المسوّدة
            </button>
            <span className="mr-auto">
              <ConfirmButton
                onConfirm={permanentDelete}
                label="حذف نهائي من الأرشيف"
                confirmLabel="نعم، احذف المحتوى"
                message="حذف أسئلة الاختبار ومرفقاته وتفاصيل الإجابات نهائياً؟ تبقى درجات الطلاب (من أدّى وكم أخذ) محفوظةً للسجلّ. إن لم يؤدِّه أحد فسيُحذف بالكامل."
                disabled={busy}
                className="text-sm text-red-500 hover:underline"
              />
            </span>
          </div>
        )
      ) : (
        <div className="flex flex-wrap gap-2">
          <button onClick={save} disabled={busy} className="btn-primary">
            {busy ? "…" : "حفظ"}
          </button>
          <button
            onClick={togglePublish}
            disabled={busy}
            className={`rounded-xl px-5 py-3 font-medium transition ${
              status === "PUBLISHED"
                ? "border border-line hover:bg-ink/5"
                : "bg-gold text-white hover:opacity-90"
            }`}
          >
            {status === "PUBLISHED" ? "إلغاء النشر" : "نشر الاختبار"}
          </button>
          <span className="mr-auto">
            <ConfirmButton
              onConfirm={del}
              label="حذف الاختبار"
              confirmLabel="نعم، احذف الاختبار"
              message="حذف هذا الاختبار؟ يُنقَل إلى الأرشيف (يمكن استعادته أو حذفه نهائياً لاحقاً)."
              disabled={busy}
              className="text-sm text-red-500 hover:underline"
            />
          </span>
        </div>
      )}
    </div>
  );
}

// صفّ سؤال في قائمة البنك (يُعاد استخدامه في البحث والأكورديون).
function QRow({ q, onAdd }: { q: BankQuestion; onAdd: () => void }) {
  return (
    <li className="flex items-center gap-2 rounded-xl border border-line p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <MathText text={q.content} />
        </p>
        <span className="text-xs text-ink/40">
          {TYPE_LABEL[q.type]} • {q.points} نقطة
          {q.chapterTitle && ` • ${q.chapterTitle}`}
        </span>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="rounded-lg bg-primary-light px-3 py-1 text-sm text-primary-dark hover:bg-primary hover:text-white"
      >
        أضف
      </button>
    </li>
  );
}
