"use client";
// src/components/teacher/ResetCardButton.tsx
// كلمة سرّ عشوائية جديدة لطالب واحد + طباعة بطاقة دخوله (QR) فوراً.
import { useState } from "react";
import { buildCredentialCardsHtml } from "@/lib/credentialCards";
import { printHtmlInHiddenFrame } from "@/lib/printHtml";

export default function ResetCardButton({
  studentId,
  studentName,
  brandName,
  teacherName,
}: {
  studentId: string;
  studentName: string;
  brandName: string;
  teacherName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function run() {
    if (
      !confirm(
        `ستُعاد كلمة سرّ «${studentName}» إلى كلمة جديدة عشوائية فتبطل كلمته الحالية، وتُطبع بطاقة دخوله. ` +
          `لا يمكن استرجاع الكلمة الجديدة بعد إغلاق نافذة الطباعة. متابعة؟`
      )
    )
      return;
    setBusy(true);
    setError("");
    setDone(false);
    const res = await fetch(`/api/teacher/students/${studentId}/reset-card`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر التنفيذ.");
      return;
    }
    setDone(true);
    const c = data.card as { name: string; studentCode: string; password: string; group: string };
    const subjects = (data.subjects as string[]) ?? [];
    printHtmlInHiddenFrame(
      buildCredentialCardsHtml(
        [{ name: c.name, studentCode: c.studentCode, password: c.password, group: c.group || undefined }],
        {
          brandName,
          teacherName,
          loginUrl: `${window.location.origin}/login?role=STUDENT`,
          contextLine: subjects.length ? `المادة: ${subjects.join("، ")}` : undefined,
        }
      )
    );
  }

  return (
    <div className="card max-w-2xl space-y-3 p-6">
      <h3 className="font-display font-semibold">بطاقة دخول جديدة</h3>
      <p className="text-sm text-ink/60">
        يولّد كلمة سرّ عشوائية جديدة لهذا الطالب ويطبع بطاقة دخوله (مع رمز QR)
        مباشرةً — مناسب لمن نسي كلمته أو فقد بطاقته.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="btn-primary disabled:opacity-50"
      >
        {busy ? "جارٍ التنفيذ…" : "إعادة تعيين وطباعة بطاقة"}
      </button>
      {done && <p className="text-sm text-primary-dark">أُعيدت كلمة السرّ وفُتحت نافذة الطباعة.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
