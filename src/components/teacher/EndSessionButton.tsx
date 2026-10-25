"use client";
// src/components/teacher/EndSessionButton.tsx
// المدرّس يُنهي جلسة طالب عالقة «قيد الأداء» ويُعطيه نتيجته من إجاباته (يظهر بعد ساعة من انتهاء وقته).
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmButton from "@/components/ConfirmButton";

export default function EndSessionButton({
  sessionId,
  studentName,
}: {
  sessionId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function end() {
    setError("");
    const res = await fetch(`/api/teacher/sessions/${sessionId}/finish`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error ?? "تعذّر إنهاء الجلسة.");
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <ConfirmButton
        onConfirm={end}
        label="⏹ إنهاء وإعطاء النتيجة"
        message={`إنهاء اختبار «${studentName}» وحساب نتيجته من إجاباته الحالية؟ لا يمكن التراجع.`}
        confirmLabel="نعم، أنهِ الاختبار"
        className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
      />
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
