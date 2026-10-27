"use client";
// src/components/student/DiagramImage.tsx
// صورة سؤال توسيم الرسم للطالب: تُعيد المحاولة تلقائياً عند تعثّر التحميل (شبكة الجوال/الخادم)،
// وتُظهر هيكلاً أثناء التحميل ورسالة مع زرّ «إعادة المحاولة» عند الفشل — فلا يرى الطالب فراغاً صامتاً.
import { useEffect, useRef, useState } from "react";

const MAX_AUTO_RETRIES = 3;

export default function DiagramImage({ id }: { id: string }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"loading" | "ok" | "failed">("loading");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function onError() {
    if (attempt < MAX_AUTO_RETRIES) {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setAttempt((a) => a + 1), 700 * (attempt + 1));
    } else {
      setState("failed");
    }
  }

  function retry() {
    setState("loading");
    setAttempt((a) => a + 1);
  }

  return (
    <div>
      {state === "loading" && (
        <div
          role="status"
          className="flex h-40 w-full items-center justify-center rounded-xl border border-line bg-ink/5 text-sm text-ink/50"
        >
          جارٍ تحميل الرسم…
        </div>
      )}
      {state === "failed" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          <span>تعذّر تحميل صورة الرسم.</span>
          <button
            type="button"
            onClick={retry}
            className="rounded-lg border border-red-300 bg-white px-3 py-1 font-medium hover:bg-red-100"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={attempt}
          src={`/api/attachments/${id}${attempt ? `?r=${attempt}` : ""}`}
          alt="رسم السؤال"
          onLoad={() => setState("ok")}
          onError={onError}
          className={
            state === "ok"
              ? "max-h-[28rem] w-full rounded-xl border border-line object-contain"
              : "absolute h-0 w-0 opacity-0"
          }
        />
      )}
    </div>
  );
}
