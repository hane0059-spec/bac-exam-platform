"use client";
// src/components/A11yLabels.tsx
// يشغّل ربط الحقول بتسمياتها تلقائياً (src/lib/a11yLabels.ts) عند أول رسم وعند كل تغيّر في الصفحة.
// لا يُظهر شيئاً ولا يغيّر السلوك المرئي.
import { useEffect } from "react";
import { associateLabels } from "@/lib/a11yLabels";

export default function A11yLabels() {
  useEffect(() => {
    // مؤقّت لا rAF: الأخير يتوقّف في التبويبات الخلفية فلا تُربط الحقول إن فُتحت الصفحة في الخلفية.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          associateLabels(document);
        } catch {
          // الإتاحة تحسين لا يجوز أن يكسر الصفحة.
        }
      }, 60);
    };
    run();
    const mo = new MutationObserver(run);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);
  return null;
}
