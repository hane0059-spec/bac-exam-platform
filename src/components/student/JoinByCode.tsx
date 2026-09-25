"use client";
// src/components/student/JoinByCode.tsx
// انضمام الطالب لاختبار عبر رمزه التسلسلي (يدوياً أو تلقائياً من رابط QR).
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function JoinByCodeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const autoTried = useRef(false);

  async function join(codeToJoin: string, goToQuiz = false) {
    setError("");
    setOk("");
    setBusy(true);
    const res = await fetch("/api/student/quizzes/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeToJoin.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر الانضمام.");
      return;
    }
    setOk(`تمت إضافة: ${data.title}`);
    setCode("");
    // القادم من رابط الاختبار يدخل صفحة الاختبار مباشرة.
    if (goToQuiz && data.quizId) {
      router.push(`/student/quizzes/${data.quizId}`);
      return;
    }
    router.refresh();
  }

  // انضمام تلقائي عند فتح الرابط من رمز QR (?join=1001) — مرّة واحدة فقط.
  useEffect(() => {
    const fromQr = searchParams.get("join");
    if (!fromQr || autoTried.current) return;
    autoTried.current = true;
    // تنظيف الرابط فوراً لتفادي إعادة المحاولة عند التحديث.
    router.replace("/student/quizzes");
    join(fromQr, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
          onKeyDown={(e) => e.key === "Enter" && join(code)}
        />
        <button
          onClick={() => join(code)}
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

// useSearchParams يتطلّب حدّ Suspense (وإلا خطأ وقت التشغيل عند الطلب الديناميكي).
export default function JoinByCode() {
  return (
    <Suspense fallback={null}>
      <JoinByCodeInner />
    </Suspense>
  );
}
