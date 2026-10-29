"use client";
// src/components/admin/TeacherResetCardButton.tsx
// كلمة سرّ عشوائية جديدة لمدرّس + طباعة بطاقة دخوله (QR) فوراً.
import { useState } from "react";
import { buildCredentialCardsHtml } from "@/lib/credentialCards";
import { printHtmlInHiddenFrame } from "@/lib/printHtml";

export default function TeacherResetCardButton({
  userId,
  teacherName,
  brandName,
  issuerName,
}: {
  userId: string;
  teacherName: string;
  brandName: string;
  issuerName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function run() {
    if (
      !confirm(
        `ستُعاد كلمة سرّ «${teacherName}» إلى كلمة جديدة عشوائية فتبطل كلمته الحالية، وتُطبع بطاقة دخوله. ` +
          `لا يمكن استرجاع الكلمة الجديدة بعد إغلاق نافذة الطباعة. متابعة؟`
      )
    )
      return;
    setBusy(true);
    setError("");
    setDone(false);
    const res = await fetch(`/api/admin/users/${userId}/reset-card`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر التنفيذ.");
      return;
    }
    setDone(true);
    const c = data.card as { name: string; code: string; password: string };
    printHtmlInHiddenFrame(
      buildCredentialCardsHtml(
        [{ name: c.name, studentCode: c.code, password: c.password }],
        {
          brandName,
          teacherName: issuerName,
          role: "TEACHER",
          loginUrl: `${window.location.origin}/login?role=TEACHER`,
        }
      )
    );
  }

  return (
    <div className="card max-w-2xl space-y-3 p-6">
      <h3 className="font-display font-semibold">بطاقة دخول جديدة</h3>
      <p className="text-sm text-ink/60">
        يولّد كلمة سرّ عشوائية جديدة لهذا المدرّس ويطبع بطاقة دخوله (مع رمز QR) مباشرةً —
        مناسب لمدرّس يدير مؤسّسته ونسي كلمته أو فقد بطاقته. تُطلب منه كلمة جديدة يختارها
        عند أول دخول.
      </p>
      <button type="button" onClick={run} disabled={busy} className="btn-primary disabled:opacity-50">
        {busy ? "جارٍ التنفيذ…" : "إعادة تعيين وطباعة بطاقة"}
      </button>
      {done && <p className="text-sm text-primary-dark">أُعيدت كلمة السرّ وفُتحت نافذة الطباعة.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
