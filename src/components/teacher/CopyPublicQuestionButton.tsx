"use client";
// src/components/teacher/CopyPublicQuestionButton.tsx
// زرّ نسخ سؤال من البنك العام إلى بنك المدرّس.
import { useState } from "react";

export default function CopyPublicQuestionButton({ id }: { id: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [msg, setMsg] = useState("");

  async function copy() {
    setState("loading");
    setMsg("");
    try {
      const res = await fetch(`/api/teacher/questions/${id}/copy`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMsg(data.error ?? "تعذّر النسخ.");
        return;
      }
      setState("done");
    } catch {
      setState("error");
      setMsg("خطأ في الاتصال.");
    }
  }

  if (state === "done") {
    return (
      <span className="text-sm font-medium text-primary">✓ أُضيفت إلى بنكك</span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        disabled={state === "loading"}
        className="rounded-xl border border-gold px-3 py-1.5 text-sm font-medium text-gold hover:bg-gold/10 disabled:opacity-50"
      >
        {state === "loading" ? "جارٍ النسخ…" : "نسخ إلى بنكي"}
      </button>
      {state === "error" && <span className="text-xs text-red-600">{msg}</span>}
    </span>
  );
}
