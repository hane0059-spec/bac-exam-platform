"use client";
// src/components/student/JoinByCode.tsx
// انضمام الطالب لاختبار عبر رمزه التسلسلي.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function join() {
    setError("");
    setOk("");
    setBusy(true);
    const res = await fetch("/api/student/quizzes/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر الانضمام.");
      return;
    }
    setOk(`تمت إضافة: ${data.title}`);
    setCode("");
    router.refresh();
  }

  return (
    <div className="card mb-6 p-4">
      <label className="mb-1 block text-sm font-medium">
        لديك رمز اختبار؟ أدخله للانضمام
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          dir="ltr"
          className="field flex-1"
          value={code}
          placeholder="مثال: 1001"
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && join()}
        />
        <button
          onClick={join}
          disabled={busy || !code.trim()}
          className="btn-primary"
        >
          انضمام
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {ok && <p className="mt-2 text-sm text-primary-dark">{ok}</p>}
    </div>
  );
}
