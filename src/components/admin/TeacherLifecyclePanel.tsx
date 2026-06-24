"use client";
// src/components/admin/TeacherLifecyclePanel.tsx
// تعطيل/تفعيل المدرّس مع خيار التسلسل إلى طلابه دفعةً — قابل للتراجع.
import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [cascade, setCascade] = useState(studentCount > 0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function apply(active: boolean) {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/set-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active, cascadeStudents: cascade }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? "تعذّر تغيير الحالة.");
        return;
      }
      const n = data.affectedStudents ?? 0;
      setMsg(
        active
          ? `أُعيد التفعيل${n ? ` (و${n} طالباً)` : ""}.`
          : `عُطّل الحساب${n ? ` (و${n} طالباً)` : ""}.`
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

      <p className="mb-3 text-sm leading-relaxed text-ink/60">
        تعطيل الحساب يمنع الدخول ويُخفيه دون فقدان بياناته (قابل للتراجع). بعد
        التعطيل يمكنك تفريغ مرفقاته من{" "}
        <a href="/admin/retention" className="text-primary hover:underline">
          صفحة الاحتفاظ
        </a>
        .
      </p>

      <a
        href={`/api/admin/users/${userId}/export`}
        className="mb-4 inline-flex items-center gap-1 rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5"
      >
        ⬇ تصدير بياناته (نسخة احتياطية محمولة)
      </a>
      <p className="mb-4 -mt-2 text-xs leading-relaxed text-ink/50">
        ملفّ JSON واحد يضمّ أسئلته واختباراته وطلابه ومرفقاته — احفظه على جهازك
        أو فلاشة قبل الحذف.
      </p>

      {studentCount > 0 && (
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={cascade}
            onChange={(e) => setCascade(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          <span>
            تطبيقها على طلابه أيضاً (<b>{studentCount}</b> طالباً أنشأهم)
          </span>
        </label>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {isActive ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => apply(false)}
            className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {busy ? "…" : cascade && studentCount > 0 ? "تعطيل الحساب وطلابه" : "تعطيل الحساب"}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => apply(true)}
            className="rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light disabled:opacity-50"
          >
            {busy ? "…" : cascade && studentCount > 0 ? "إعادة تفعيل الحساب وطلابه" : "إعادة تفعيل الحساب"}
          </button>
        )}
        {msg && <span className="text-sm text-primary">{msg}</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  );
}
