"use client";
// src/components/PwaRegister.tsx
// يسجّل Service Worker الإشعارات (public/sw.js) عند تحميل أيّ صفحة. لا يعرض شيئاً.
import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
