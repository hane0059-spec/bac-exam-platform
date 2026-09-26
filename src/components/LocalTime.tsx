"use client";
// src/components/LocalTime.tsx
// يعرض تاريخاً/وقتاً بتوقيت جهاز المستخدم نفسه (لا توقيت الخادم). الخادم (Vercel)
// يعمل بتوقيت UTC، فأي تنسيق على الخادم كان يُظهر فرق ساعات عن الوقت الفعلي.
import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/datetime";

export default function LocalTime({ value }: { value: string | Date }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    setText(formatDateTime(value));
  }, [value]);
  // قبل التركيب: نصّ محجوز (تفادياً لومضة وقت خاطئ ولعدم تطابق الـ hydration).
  return <span suppressHydrationWarning>{text ?? "··/··/···· ··:··"}</span>;
}
