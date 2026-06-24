"use client";
// src/components/teacher/RequestAccountDeletion.tsx
// المدرّس يطلب حذف حسابه من المدير (بتأكيد). يُشعَر المدير ليصدّر ثمّ يحذف.
import { useState } from "react";

export default function RequestAccountDeletion() {
  const [state, setState] = useState<
    "idle" | "confirm" | "loading" | "done" | "error"
  >("idle");
  const [msg, setMsg] = useState("");

  async function send() {
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/teacher/account/deletion-request", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMsg(data.error ?? "تعذّر إرسال الطلب.");
        return;
      }
      setState("done");
      setMsg(
        data.alreadyRequested
          ? "طلبك مُرسَلٌ سابقاً وقيد المراجعة."
          : "أُرسل طلبك إلى المدير. سيتواصل لتصدير بياناتك قبل الحذف."
      );
    } catch {
      setState("error");
      setMsg("خطأ في الاتصال.");
    }
  }

  return (
    <div className="card border-red-200 p-5">
      <h3 className="mb-2 font-display font-semibold text-red-700">حذف الحساب</h3>
      <p className="mb-3 text-sm leading-relaxed text-ink/60">
        إن رغبت بمغادرة المنصّة، يمكنك طلب حذف حسابك من المدير. سيصدّر بياناتك
        (أسئلتك واختباراتك) إلى نسخة احتياطية يسلّمها لك، ثمّ يحذف حسابه ويحرّر
        التخزين. <b>الطلب لا يحذف شيئاً فوراً</b> — المدير ينفّذه.
      </p>

      {state === "done" ? (
        <p className="text-sm font-medium text-primary">{msg}</p>
      ) : state === "confirm" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-red-600">تأكيد إرسال الطلب؟</span>
          <button
            type="button"
            onClick={send}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            نعم، أرسِل الطلب
          </button>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="text-sm text-ink/50 hover:underline"
          >
            تراجع
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={state === "loading"}
            onClick={() => setState("confirm")}
            className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {state === "loading" ? "…" : "طلب حذف حسابي"}
          </button>
          {state === "error" && (
            <span className="text-sm text-red-600">{msg}</span>
          )}
        </div>
      )}
    </div>
  );
}
