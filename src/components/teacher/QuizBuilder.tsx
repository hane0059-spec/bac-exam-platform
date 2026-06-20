"use client";
// src/components/teacher/QuizBuilder.tsx
// باني الاختبار: بيانات + إعدادات + نافذة توقيت + اختيار/ترتيب أسئلة + تجاوز علامة + نشر.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DateTimeField from "@/components/DateTimeField";
import ConfirmButton from "@/components/ConfirmButton";

type QType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";

interface BankQuestion {
  id: string;
  content: string;
  type: QType;
  points: number;
  difficulty: string;
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
  initialItems,
  initial,
}: {
  quizId: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  purged?: boolean;
  canEditStructure: boolean;
  bank: BankQuestion[];
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

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const bankMap = useMemo(
    () => new Map(bank.map((q) => [q.id, q])),
    [bank]
  );
  const available = bank.filter(
    (q) => !items.some((it) => it.questionId === q.id)
  );

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
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold">
            أسئلة الاختبار ({items.length})
          </h3>
          <span className="text-sm text-ink/60">
            المجموع: {totalPoints} نقطة
          </span>
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

      {/* إضافة من البنك */}
      {!ro && (
        <div className="card space-y-2 p-5">
          <h3 className="font-display font-semibold">أضف من بنك الأسئلة</h3>
          {available.length === 0 ? (
            <p className="text-sm text-ink/50">
              لا أسئلة متاحة لهذه المادة. أنشئ أسئلة في بنك الأسئلة أولاً.
            </p>
          ) : (
            <ul className="space-y-2">
              {available.map((q) => (
                <li
                  key={q.id}
                  className="flex items-center gap-2 rounded-xl border border-line p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{q.content}</p>
                    <span className="text-xs text-ink/40">
                      {TYPE_LABEL[q.type]} • {q.points} نقطة
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(q.id)}
                    className="rounded-lg bg-primary-light px-3 py-1 text-sm text-primary-dark hover:bg-primary hover:text-white"
                  >
                    أضف
                  </button>
                </li>
              ))}
            </ul>
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
