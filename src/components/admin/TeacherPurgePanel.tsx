"use client";
// src/components/admin/TeacherPurgePanel.tsx
// «حذف كامل مع كل ما أنشأه»: يعرض الأعداد الحقيقية (بما فيها المخفيّ)، ويطلب كتابة اسم الحساب، ثم ينفّذ على دفعات
// (يعيد الطلب حتى ينتهي، فيصلح لحسابات فيها مئات الطلاب والاختبارات).
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Preview {
  name: string;
  isActive: boolean;
  studentsToDelete: number;
  studentsToKeep: number;
  quizzes: { total: number; draft: number; published: number; archived: number };
  sessionsOnQuizzes: number;
  questions: { total: number; inBank: number; hidden: number };
  enrichmentPrivate: number;
  enrichmentPublicKept: number;
  questionsUsedByOthers: number;
}
interface Progress {
  students: number;
  detachedStudents: number;
  quizzes: number;
  questions: number;
}

export default function TeacherPurgePanel({ userId }: { userId: string }) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [typed, setTyped] = useState("");
  const [backupOk, setBackupOk] = useState(false); // أقرّ المدير أنه نزّل نسخة أو لا يحتاجها
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [total, setTotal] = useState<Progress | null>(null);

  async function load() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/purge`);
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(d.error ?? "تعذّر جلب المعاينة.");
      setPreview(d.preview);
    } catch {
      setErr("خطأ في الاتصال.");
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (!preview) return;
    if (!confirm(`حذف «${preview.name}» وكل ما أنشأه نهائياً؟ لا يمكن التراجع.`)) return;
    setBusy(true);
    setErr("");
    const sum: Progress = { students: 0, detachedStudents: 0, quizzes: 0, questions: 0 };
    setTotal(sum);
    try {
      // كل طلب ينفّذ ضمن مهلة؛ نكرّر حتى done (أو يختفي الحساب 404 بعد اكتماله).
      for (let i = 0; i < 200; i++) {
        const res = await fetch(`/api/admin/users/${userId}/purge`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ confirmName: typed }),
        });
        const d = await res.json().catch(() => ({}));
        if (res.status === 404 && i > 0) return done();
        if (!res.ok) return setErr(d.error ?? "تعذّر الحذف.");
        const p: Progress = d.progress;
        sum.students += p.students;
        sum.detachedStudents += p.detachedStudents;
        sum.quizzes += p.quizzes;
        sum.questions += p.questions;
        setTotal({ ...sum });
        if (d.done) return done();
      }
      setErr("استغرق الحذف وقتاً طويلاً؛ أعد الضغط لإكماله.");
    } catch {
      setErr("انقطع الاتصال أثناء الحذف — أعد الضغط ليُكمَل من حيث توقّف.");
    } finally {
      setBusy(false);
    }
  }

  function done() {
    router.push("/admin/users");
    router.refresh();
  }

  const blocked = (preview?.questionsUsedByOthers ?? 0) > 0;
  return (
    <section className="card mt-6 border border-red-200 p-5">
      <h3 className="font-display font-semibold text-red-800">🗑️ حذف كامل مع كل ما أنشأه</h3>
      <p className="mt-1 text-sm text-ink/70">
        للحسابات التجريبية أو الخاطئة: يحذف المدرّس وطلابه (غير المشتركين مع مدرّس آخر) واختباراته بكل نتائجها وأسئلته
        ومحتواه. <b>لا رجعة فيه</b>. إن أردتَ الاحتفاظ بشيء فنزّل نسخة التصدير أولاً (أعلاه)، أو استعمل «التعطيل».
      </p>

      {!preview ? (
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="mt-3 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
        >
          {busy ? "جارٍ الجلب…" : "عرض ما سيُحذف"}
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <ul className="space-y-1 rounded-xl bg-ink/5 p-3 text-sm">
            <li>👥 طلاب سيُحذفون بنتائجهم: <b>{preview.studentsToDelete}</b></li>
            {preview.studentsToKeep > 0 && (
              <li>🤝 طلاب مشتركون مع مدرّس آخر (يبقون ويُفصَلون عنه): <b>{preview.studentsToKeep}</b></li>
            )}
            <li>
              📝 اختبارات: <b>{preview.quizzes.total}</b> (مسودّة {preview.quizzes.draft} · منشور {preview.quizzes.published} · مؤرشف{" "}
              {preview.quizzes.archived}) — نتائج الطلاب عليها: <b>{preview.sessionsOnQuizzes}</b>
            </li>
            <li>
              ❓ أسئلة: <b>{preview.questions.total}</b> (في البنك {preview.questions.inBank} · داخل اختبارات فقط{" "}
              {preview.questions.hidden})
            </li>
            <li>📚 ملفّات إثراء خاصّة: <b>{preview.enrichmentPrivate}</b></li>
            {preview.enrichmentPublicKept > 0 && (
              <li>🌐 منشورات عامّة معتمَدة رفعها (تبقى في الصفحة العامّة): <b>{preview.enrichmentPublicKept}</b></li>
            )}
          </ul>

          {blocked && (
            <p className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">
              ⚠️ {preview.questionsUsedByOthers} من أسئلته مستعمَلة داخل اختبارات مدرّسين آخرين؛ الحذف الشامل سيُرفض حتى تُعالَج.
            </p>
          )}

          <div className="rounded-xl border border-line p-3 text-sm">
            <a
              href={`/api/admin/users/${userId}/export`}
              className="font-semibold text-primary underline"
            >
              ⬇️ تنزيل نسخة كاملة من بيانات هذا المدرّس (JSON) قبل الحذف
            </a>
            <label className="mt-2 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={backupOk}
                onChange={(e) => setBackupOk(e.target.checked)}
                disabled={busy}
                className="mt-1"
              />
              <span>نزّلتُ النسخة، أو لا أحتاج إلى أي نسخة من هذه البيانات.</span>
            </label>
          </div>

          <div>
            <label htmlFor="purge-confirm" className="mb-1.5 block text-sm font-medium">
              للتأكيد اكتب اسم الحساب كما يظهر: <bdi className="font-bold">{preview.name}</bdi>
            </label>
            <input
              id="purge-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="field"
              autoComplete="off"
              disabled={busy}
            />
          </div>
          <button
            type="button"
            onClick={run}
            disabled={busy || !typed.trim() || !backupOk}
            className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          >
            {busy ? "جارٍ الحذف… لا تغلق الصفحة" : "حذف نهائي كامل"}
          </button>
          {total && (
            <p className="text-xs text-ink/70">
              حُذف حتى الآن: {total.students} طالباً · {total.quizzes} اختباراً · {total.questions} سؤالاً
              {total.detachedStudents > 0 && ` · فُصل ${total.detachedStudents} طالباً مشتركاً`}
            </p>
          )}
        </div>
      )}
      {err && <p className="mt-3 text-sm text-red-700">{err}</p>}
    </section>
  );
}
