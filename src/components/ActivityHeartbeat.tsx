"use client";
// src/components/ActivityHeartbeat.tsx
// نبضة كل دقيقتين وهي ظاهرة (وعند العودة للتبويب) فيظهر المستخدم «متصلاً الآن» ما دامت صفحته مفتوحة
// أمامه — لا يُرسَل شيء والتبويب مخفيّ أو الشاشة مطفأة. لا يعرض شيئاً.
import { useEffect } from "react";

const INTERVAL_MS = 120_000;

export default function ActivityHeartbeat() {
  useEffect(() => {
    let last = Date.now(); // عرض الصفحة نفسه سجّل الظهور للتوّ
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      last = Date.now();
      fetch("/api/ping", { method: "POST", credentials: "same-origin", keepalive: true }).catch(() => {});
    };
    const timer = setInterval(ping, INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last > 60_000) ping();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
