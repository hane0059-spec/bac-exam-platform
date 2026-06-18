"use client";
// src/components/ThemeToggle.tsx
// تبديل الوضع الفاتح/الليلي — يُحفظ على الجهاز (تفضيل شخصي لكل مستخدم).
import { useEffect, useState } from "react";

export const THEME_KEY = "bac-theme";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  // مزامنة الحالة مع ما هو مطبّق فعلاً (طبّقه سكربت ما قبل الرسم في layout).
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* تجاهل تعذّر الحفظ */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      title={dark ? "الوضع الفاتح" : "الوضع الليلي"}
      className="flex h-10 items-center justify-center rounded-xl border border-line bg-surface px-3 text-sm font-medium transition hover:bg-primary-light"
    >
      <span aria-hidden>{dark ? "☀️" : "🌙"}</span>
    </button>
  );
}
