"use client";
// src/components/admin/TeacherLifecyclePanel.tsx
// دورة حياة المدرّس: تصدير + تعطيل/تفعيل بسيط + «مغادرة» (تفريغ مرفقات + تعطيل
// الحساب + تعطيل قيد الطلاب في مادته، مع إبقاء الطلاب المشتركين).
import { useState } from "react";
import { useRouter } from "next/navigation";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} ب`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} ك.ب`;
  return `${(n / (1024 * 1024)).toFixed(1)} م.ب`;
}

export default function TeacherLifecyclePanel({
  userId,
  isActive,
  studentCount,
}: {
  userId: string;
  isActive: boolean;
  studentCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [confirmOffboard, setConfirmOffboard] = useState(false);

  async function setActive(active: boolean) {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/set-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active, cascadeStudents: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? "تعذّر تغيير الحالة.");
        return;
      }
      setMsg(active ? "أُعيد التفعيل." : "عُطّل الحساب.");
      router.refresh();
    } catch {
      setErr("خطأ في الاتصال.");
    } finally {
      setBusy(false);
    }
  }

  async function offboard() {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/offboard`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? "تعذّرت المغادرة.");
        return;
      }
      setConfirmOffboard(false);
      setMsg(
        `تمّت المغادرة: حُرّر ${fmtBytes(data.freedBytes ?? 0)} (${
          data.deletedAttachments ?? 0
        } مرفقاً)، عُطّل ${data.deactivatedStudents ?? 0} طالباً حصرياً، وبقي ${
          data.keptStudents ?? 0
        } نشطين في موادّهم الأخرى.`
      );
      router.refresh();
    } catch {
      setErr("خطأ في الاتصال.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display font-semibold">دورة حياة الحساب</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs ${
            isActive
              ? "bg-primary-light text-primary-dark"
              : "bg-ink/10 text-ink/50"
          }`}
        >
          {isActive ? "نشط" : "معطّل"}
        </span>
      </div>

      {/* تصدير */}
      <a
        href={`/api/admin/users/${userId}/export`}
        className="inline-flex items-center gap-1 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5"
      >
        ⬇ تصدير بياناته (نسخة احتياطية محمولة)
      </a>
      <p className="mt-2 text-xs leading-relaxed text-ink/50">
        ملفّ JSON واحد يضمّ أسئلته واختباراته وطلابه ومرفقاته — احفظه على جهازك
        أو فلاشة قبل المغادرة.
      </p>

      {/* تعطيل/تفعيل بسيط (المدرّس وحده، قابل للتراجع) */}
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line/60 pt-4">
        <span className="text-sm text-ink/60">تعطيل مؤقّت للحساب:</span>
        {isActive ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setActive(false)}
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
          >
            تعطيل الحساب
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setActive(true)}
            className="rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light disabled:opacity-50"
          >
            إعادة تفعيل الحساب
          </button>
        )}
      </div>

      {/* مغادرة: تفريغ المرفقات + تعطيل + معالجة الطلاب */}
      <div className="mt-4 rounded-xl border border-red-200 bg-red-50/40 p-4">
        <h4 className="mb-1 text-sm font-semibold text-red-700">
          مغادرة المدرّس (تحرير التخزين)
        </h4>
        <p className="mb-3 text-xs leading-relaxed text-ink/60">
          تحذف <b>مرفقاته الثقيلة</b> (صور/ملفّات) لتحرير التخزين، وتعطّل حسابه،
          وتعطّل قيد طلابه في مادته — والطالب المسجَّل بمواد أخرى <b>يبقى نشطاً</b>
          لديها، ويُعطَّل كلّياً فقط إن كان حصرياً عند هذا المدرّس. تبقى الأسئلة
          والدرجات (نصّ). <b>صدّر بياناته أوّلاً</b> — حذف المرفقات لا تراجع فيه.
          {studentCount > 0 && (
            <>
              {" "}
              له <b>{studentCount}</b> طالباً أنشأهم.
            </>
          )}
        </p>

        {confirmOffboard ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-red-700">
              متأكّد؟ حذف المرفقات نهائيّ
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={offboard}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "جارٍ التنفيذ…" : "نعم، نفّذ المغادرة"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOffboard(false)}
              className="text-xs text-ink/50 hover:underline"
            >
              إلغاء
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmOffboard(true)}
            className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
          >
            تنفيذ المغادرة
          </button>
        )}
      </div>

      {(msg || err) && (
        <p className={`mt-3 text-sm ${err ? "text-red-600" : "text-primary"}`}>
          {err || msg}
        </p>
      )}
    </div>
  );
}
