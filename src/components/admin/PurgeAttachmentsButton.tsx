"use client";
// src/components/admin/PurgeAttachmentsButton.tsx
// زرّ تفريغ مرفقات مستخدم مغادر — بتأكيد من خطوتين (العملية غير قابلة للتراجع).
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PurgeAttachmentsButton({
  userId,
  disabled,
}: {
  userId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "loading" | "error">(
    "idle"
  );
  const [msg, setMsg] = useState("");

  async function run() {
    setState("loading");
    setMsg("");
    try {
      const res = await fetch(
        `/api/admin/users/${userId}/purge-attachments`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMsg(data.error ?? "تعذّر التفريغ.");
        return;
      }
      router.refresh();
    } catch {
      setState("error");
      setMsg("خطأ في الاتصال.");
    }
  }

  if (disabled) {
    return (
      <span className="text-xs text-ink/40">عطّل المستخدم أوّلاً</span>
    );
  }

  if (state === "confirm") {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-red-600">متأكّد؟ لا تراجع</span>
        <button
          type="button"
          onClick={run}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          نعم، فرّغ
        </button>
        <button
          type="button"
          onClick={() => setState("idle")}
          className="text-xs text-ink/50 hover:underline"
        >
          إلغاء
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={state === "loading"}
        onClick={() => setState("confirm")}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {state === "loading" ? "جارٍ التفريغ…" : "تفريغ المرفقات"}
      </button>
      {state === "error" && <span className="text-xs text-red-600">{msg}</span>}
    </span>
  );
}
