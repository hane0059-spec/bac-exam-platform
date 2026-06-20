"use client";
// src/components/teacher/DeleteQuestionButton.tsx
// حذف سؤال (ناعم) بتأكيد داخل الواجهة، ثم تحديث القائمة.
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";

export default function DeleteQuestionButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onDelete() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/teacher/questions/${id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError("تعذّر الحذف.");
  }

  return (
    <span>
      <ConfirmButton
        onConfirm={onDelete}
        label="حذف"
        confirmLabel="حذف السؤال"
        message="حذف هذا السؤال؟ يمكن إنشاء غيره لاحقاً."
        disabled={busy}
        className="text-sm text-red-500 hover:underline disabled:opacity-50"
      />
      {error && <span className="mr-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
