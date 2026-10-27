"use client";
// src/components/teacher/CopyPublicQuestionButton.tsx
// زرّ نسخ سؤال من البنك العام إلى بنك المدرّس، أو «نسخ وتعديل» (ينسخ ثم يفتح التعديل مباشرة).
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CopyPublicQuestionButton({ id }: { id: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [msg, setMsg] = useState("");
  const [newId, setNewId] = useState<string | null>(null);
  const router = useRouter();

  async function copy(thenEdit = false) {
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
      setNewId(data.id ?? null);
      if (thenEdit && data.id) {
        router.push(`/teacher/questions/${data.id}/edit`);
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
      <span className="flex items-center gap-3 text-sm">
        <span className="font-medium text-primary">✓ أُضيفت إلى بنكك</span>
        {newId && (
          <Link
            href={`/teacher/questions/${newId}/edit`}
            className="text-primary hover:underline"
          >
            تعديلها ←
          </Link>
        )}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => copy(false)}
        disabled={state === "loading"}
        className="rounded-xl border border-gold px-3 py-1.5 text-sm font-medium text-gold hover:bg-gold/10 disabled:opacity-50"
      >
        {state === "loading" ? "جارٍ النسخ…" : "نسخ إلى بنكي"}
      </button>
      <button
        type="button"
        onClick={() => copy(true)}
        disabled={state === "loading"}
        title="ينسخ السؤال إلى بنكك ثم يفتح صفحة تعديله مباشرة"
        className="rounded-xl border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-light disabled:opacity-50"
      >
        نسخ وتعديل
      </button>
      {state === "error" && <span className="text-xs text-red-600">{msg}</span>}
    </span>
  );
}
