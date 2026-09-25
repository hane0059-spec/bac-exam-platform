"use client";
// src/components/teacher/TeacherPageLink.tsx
// رابط صفحة اختبارات المدرّس العامّة (للتعليق في قناة/مجموعة الطلاب) مع نسخ.
import { useEffect, useState } from "react";
import QuizShareLink from "@/components/QuizShareLink";

export default function TeacherPageLink({ path }: { path: string }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  if (!origin) return null;
  return (
    <div className="card mb-4 p-4">
      <p className="text-sm font-medium">رابط صفحة اختباراتي (ثابت — شاركه مرة واحدة)</p>
      <p className="mt-0.5 text-xs text-ink/50">
        يعرض اختباراتك المنشورة المفعّل فيها «الانضمام عبر الرمز»؛ الطالب يختار ويدخل
        مباشرة، وتتحدّث القائمة تلقائياً كلما نشرت اختباراً جديداً.
      </p>
      <QuizShareLink url={`${origin}${path}`} />
    </div>
  );
}
