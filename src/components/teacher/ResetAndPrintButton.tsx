"use client";
// src/components/teacher/ResetAndPrintButton.tsx
// يعيد تعيين كلمات سرّ طلاب مجموعة (من لم يدخل بعد) ويطبع بطاقات دخولهم الجديدة.
import { useState } from "react";
import { buildCredentialCardsHtml } from "@/lib/credentialCards";
import { printHtmlInHiddenFrame } from "@/lib/printHtml";

export default function ResetAndPrintButton({
  subjectId,
  subjectName,
  groupName,
  count,
  brandName,
  teacherName,
}: {
  subjectId: string;
  subjectName: string;
  /** "" = بلا مجموعة. */
  groupName: string;
  count: number;
  brandName: string;
  teacherName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function run() {
    const label = groupName || "الطلاب بلا مجموعة";
    if (
      !confirm(
        `ستُعاد كلمات سرّ طلاب «${label}» في ${subjectName} (حتى ${count} طالباً) إلى كلمات جديدة، فتبطل كلمات سرّهم الحالية. ` +
          `يُستثنى من دخل المنصّة فعلاً. تُطبع بعدها بطاقاتهم ولا يمكن استرجاع الكلمات الجديدة لاحقاً. متابعة؟`
      )
    )
      return;
    setBusy(true);
    setError("");
    setMsg("");
    const res = await fetch("/api/teacher/students/reset-passwords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, groupName }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر التنفيذ.");
      return;
    }
    const reset = data.reset as {
      name: string;
      studentCode: string;
      password: string;
      group: string;
      grade: string;
    }[];
    const skipped = data.skipped as { name: string; studentCode: string }[];
    setMsg(
      `أُعيد تعيين ${reset.length} طالباً` +
        (skipped.length > 0
          ? ` — استُثني ${skipped.length} لأنهم دخلوا المنصّة: ${skipped
              .map((s) => s.studentCode)
              .join("، ")}`
          : "")
    );
    if (reset.length > 0) {
      printHtmlInHiddenFrame(
        buildCredentialCardsHtml(
          reset.map((r) => ({
            name: r.name,
            studentCode: r.studentCode,
            password: r.password,
            group: r.group || undefined,
            grade: r.grade || undefined,
          })),
          {
            brandName,
            teacherName,
            loginUrl: `${window.location.origin}/login?role=STUDENT`,
            contextLine: `المادة: ${subjectName}`,
          }
        )
      );
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pb-1">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded-xl border border-line px-3 py-1.5 text-sm font-medium transition hover:bg-ink/5 disabled:opacity-50"
      >
        {busy ? "جارٍ التنفيذ…" : "إعادة تعيين كلمات السرّ وطباعة البطاقات"}
      </button>
      {msg && <span className="text-sm text-primary-dark">{msg}</span>}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
