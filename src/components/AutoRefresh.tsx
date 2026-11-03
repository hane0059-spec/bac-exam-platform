"use client";
// src/components/AutoRefresh.tsx
// يُعيد جلب بيانات الصفحة الحالية (router.refresh) كل فترة وهي ظاهرة فقط، وعند عودة التبويب بعد انقطاع.
// يحفظ حالة العناصر في الصفحة (مثل نصّ مكتوب في صندوق البحث) لأنّ التحديث جزئي. لا يعرض شيئاً.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({ everyMs = 30_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      last = Date.now();
      router.refresh();
    };
    const timer = setInterval(refresh, everyMs);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last > everyMs) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, everyMs]);
  return null;
}
