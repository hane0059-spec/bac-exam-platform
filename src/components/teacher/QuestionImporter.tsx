"use client";
// src/components/teacher/QuestionImporter.tsx
// استيراد أسئلة من ملفّ JSON: اختيار الهدف ← قراءة الملفّ ← معاينة (dryRun) ← تأكيد.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Concept {
  id: string;
  title: string;
}
interface Chapter {
  id: string;
  title: string;
  concepts: Concept[];
}
interface Subject {
  id: string;
  name: string;
  chapters: Chapter[];
}

interface ByType {
  type: string;
  label: string;
  count: number;
}
interface WarnRow {
  sourceId: string;
  type: string;
  typeLabel: string;
  warnings: string[];
}
interface RejectRow {
  sourceId: string;
  sourceType: string;
  reason: string;
}
interface SampleRow {
  sourceId: string;
  type: string;
  typeLabel: string;
  points: number;
  content: string;
}
interface Summary {
  subjectName: string | null;
  total: number;
  importable: number;
  rejectedCount: number;
  totalPoints: number;
  byType: ByType[];
  warnings: WarnRow[];
  rejected: RejectRow[];
  sample: SampleRow[];
}

export default function QuestionImporter({
  subjects,
  endpoint = "/api/teacher/questions/import",
  bankPath = "/teacher/questions",
  bankLabel = "بنك الأسئلة",
}: {
  subjects: Subject[];
  endpoint?: string;
  bankPath?: string;
  bankLabel?: string;
}) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [conceptId, setConceptId] = useState("");
  const [fileObj, setFileObj] = useState<unknown>(null);
  const [fileName, setFileName] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState("");
  const [doneCount, setDoneCount] = useState<number | null>(null);

  const chapters = useMemo(
    () => subjects.find((s) => s.id === subjectId)?.chapters ?? [],
    [subjects, subjectId]
  );
  const concepts = useMemo(
    () => chapters.find((c) => c.id === chapterId)?.concepts ?? [],
    [chapters, chapterId]
  );

  function reset() {
    setSummary(null);
    setDoneCount(null);
    setError("");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    reset();
    setFileObj(null);
    setFileName("");
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    try {
      const text = await f.text();
      setFileObj(JSON.parse(text));
    } catch {
      setError("تعذّر قراءة الملفّ: ليس JSON صالحاً.");
    }
  }

  async function send(dryRun: boolean) {
    if (!subjectId) {
      setError("اختر المادة الهدف أوّلاً.");
      return;
    }
    if (fileObj == null) {
      setError("اختر ملفّ JSON صالحاً.");
      return;
    }
    setError("");
    setLoading(dryRun ? "preview" : "commit");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          chapterId: chapterId || null,
          conceptId: conceptId || null,
          dryRun,
          file: fileObj,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّر الاستيراد.");
        return;
      }
      if (dryRun) {
        setSummary(data.summary as Summary);
        setDoneCount(null);
      } else {
        setDoneCount(data.importedCount as number);
        setSummary(null);
        router.refresh();
      }
    } catch {
      setError("خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(null);
    }
  }

  const selectCls =
    "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm";

  return (
    <div className="space-y-5">
      {/* الهدف */}
      <div className="card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">
          الوجهة في بنكك
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs text-ink/60">
              المادة (إلزامي)
            </span>
            <select
              className={selectCls}
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setChapterId("");
                setConceptId("");
                reset();
              }}
            >
              <option value="">— اختر —</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-ink/60">
              الفصل (اختياري)
            </span>
            <select
              className={selectCls}
              value={chapterId}
              disabled={!subjectId}
              onChange={(e) => {
                setChapterId(e.target.value);
                setConceptId("");
              }}
            >
              <option value="">— الكل —</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-ink/60">
              الدرس (اختياري)
            </span>
            <select
              className={selectCls}
              value={conceptId}
              disabled={!chapterId}
              onChange={(e) => setConceptId(e.target.value)}
            >
              <option value="">— الكل —</option>
              {concepts.map((co) => (
                <option key={co.id} value={co.id}>
                  {co.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* الملفّ */}
      <div className="card p-5">
        <h3 className="mb-3 font-display text-base font-semibold">الملفّ</h3>
        <input
          type="file"
          accept=".json,application/json"
          onChange={onFile}
          className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-primary-dark"
        />
        {fileName && (
          <p className="mt-2 text-xs text-ink/50">
            الملفّ: <span className="font-medium">{fileName}</span>
            {fileObj != null && " ✓"}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => send(true)}
            disabled={loading != null || !subjectId || fileObj == null}
            className="btn-primary disabled:opacity-50"
          >
            {loading === "preview" ? "جارٍ التحليل…" : "معاينة"}
          </button>
          {summary && summary.importable > 0 && (
            <button
              type="button"
              onClick={() => send(false)}
              disabled={loading != null}
              className="rounded-xl border border-gold px-4 py-2 text-sm font-medium text-gold hover:bg-gold/10 disabled:opacity-50"
            >
              {loading === "commit"
                ? "جارٍ الاستيراد…"
                : `تأكيد استيراد ${summary.importable} سؤالاً`}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {doneCount != null && (
        <div className="rounded-xl border border-primary bg-primary-light p-4 text-sm text-primary-dark">
          تمّ استيراد <b>{doneCount}</b> سؤالاً بنجاح. تجدها في{" "}
          <a href={bankPath} className="underline">
            {bankLabel}
          </a>
          .
        </div>
      )}

      {/* المعاينة */}
      {summary && (
        <div className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-display text-base font-semibold">المعاينة</h3>
            {summary.subjectName && (
              <span className="text-xs text-ink/50">
                مادة الملفّ: {summary.subjectName}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="إجمالي الملفّ" value={summary.total} />
            <Stat label="قابلة للاستيراد" value={summary.importable} tone="primary" />
            <Stat
              label="مرفوضة"
              value={summary.rejectedCount}
              tone={summary.rejectedCount > 0 ? "gold" : "muted"}
            />
            <Stat
              label="مجموع العلامات"
              value={summary.totalPoints}
              tone="gold"
            />
          </div>

          {/* الأعداد لكل نوع */}
          <div>
            <p className="mb-2 text-sm font-medium">التوزيع حسب النوع:</p>
            <div className="flex flex-wrap gap-2">
              {summary.byType.map((b) => (
                <span
                  key={b.type}
                  className="rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary-dark"
                >
                  {b.label}: {b.count}
                </span>
              ))}
            </div>
          </div>

          {/* عيّنة */}
          {summary.sample.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">عيّنة:</p>
              <ul className="space-y-2">
                {summary.sample.map((s) => (
                  <li
                    key={s.sourceId}
                    className="rounded-lg border border-line p-2 text-xs"
                  >
                    <span className="ml-2 rounded bg-ink/5 px-1.5 py-0.5 text-ink/60">
                      {s.typeLabel} · {s.points} ن
                    </span>
                    <span className="text-ink/80">{s.content}…</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* تنبيهات */}
          {summary.warnings.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-gold">
                التنبيهات ({summary.warnings.length})
              </summary>
              <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-ink/60">
                {summary.warnings.map((w) => (
                  <li key={w.sourceId}>
                    <b>{w.sourceId}</b> ({w.typeLabel}): {w.warnings.join("؛ ")}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* مرفوضة */}
          {summary.rejected.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-red-600">
                المرفوضة ({summary.rejectedCount})
              </summary>
              <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-ink/60">
                {summary.rejected.map((r, i) => (
                  <li key={`${r.sourceId}-${i}`}>
                    <b>{r.sourceId}</b> ({r.sourceType}): {r.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "primary" | "gold" | "muted";
}) {
  const cls = {
    default: "text-ink",
    primary: "text-primary",
    gold: "text-gold",
    muted: "text-ink/50",
  }[tone];
  return (
    <div className="rounded-xl border border-line p-3 text-center">
      <div className={`font-display text-xl font-bold ${cls}`}>{value}</div>
      <div className="mt-0.5 text-xs text-ink/60">{label}</div>
    </div>
  );
}
