"use client";
// src/components/teacher/DeleteQuestionButton.tsx
// حذف سؤال (ناعم) مع تأكيد، ثم تحديث القائمة.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteQuestionButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm("حذف هذا السؤال؟ يمكن إنشاء غيره لاحقاً.")) return;
    setBusy(true);
    const res = await fetch(`/api/teacher/questions/${id}`, {
      method: "DELETE",
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("تعذّر الحذف.");
  }

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className="text-sm text-red-500 hover:underline disabled:opacity-50"
    >
      حذف
    </button>
  );
}
