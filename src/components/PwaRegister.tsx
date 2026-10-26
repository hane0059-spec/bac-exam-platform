"use client";
// src/components/PwaRegister.tsx
// يسجّل Service Worker الإشعارات (public/sw.js) عند تحميل أيّ صفحة، ويربط الجهاز بالحساب الحالي
// إن كانت الإشعارات مفعّلة (لمن يبدّل حساباته على الجهاز نفسه). لا يعرض شيئاً.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { syncThisDevice } from "@/lib/pushClient";

export default function PwaRegister() {
  // يُعاد التشغيل عند كل تنقّل: بعد الدخول بحساب جديد (تنقّل بلا إعادة تحميل) يُربَط الجهاز به. محميّ بعلم الجلسة فلا طلبات زائدة.
  const pathname = usePathname();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => syncThisDevice())
      .catch(() => {});
  }, [pathname]);
  return null;
}
