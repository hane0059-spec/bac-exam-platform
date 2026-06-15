"use client";
// src/components/student/QuizCountdown.tsx
// يعرض وقت بدء/انتهاء الاختبار وعدّاً تنازلياً حيّاً، ويحدّث الصفحة تلقائياً
// عند دخول وقت البدء أو انتهاء الإتاحة (دون تحديث يدوي).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/datetime";

function human(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (d > 0) return `${d} يوم و${h} ساعة`;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function QuizCountdown({
  from,
  until,
}: {
  from: string | null;
  until: string | null;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);
  const refreshed = useRef({ from: false, until: false });

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fromT = from ? new Date(from).getTime() : null;
  const untilT = until ? new Date(until).getTime() : null;

  // تحديث الصفحة مرّة واحدة عند تجاوز كل حدّ زمني.
  useEffect(() => {
    if (!mounted) return;
    if (fromT && !refreshed.current.from && now >= fromT) {
      refreshed.current.from = true;
      router.refresh();
    }
    if (untilT && !refreshed.current.until && now >= untilT) {
      refreshed.current.until = true;
      router.refresh();
    }
  }, [mounted, now, fromT, untilT, router]);

  let status: { text: string; cls: string } | null = null;
  if (mounted) {
    if (fromT && now < fromT) {
      status = {
        text: `يبدأ بعد ${human(fromT - now)}`,
        cls: "text-gold",
      };
    } else if (untilT && now > untilT) {
      status = { text: "انتهت الإتاحة", cls: "text-ink/50" };
    } else if (untilT) {
      status = {
        text: `متاح — يتبقّى ${human(untilT - now)}`,
        cls: "text-primary-dark",
      };
    } else {
      status = { text: "متاح الآن", cls: "text-primary-dark" };
    }
  }

  return (
    <div className="mt-1 space-y-0.5 rounded-lg bg-ink/5 px-3 py-2 text-xs">
      {from && (
        <div className="text-ink/60">
          يبدأ:{" "}
          <bdi dir="ltr" className="inline-block">
            {formatDateTime(from)}
          </bdi>
        </div>
      )}
      {until && (
        <div className="text-ink/60">
          ينتهي:{" "}
          <bdi dir="ltr" className="inline-block">
            {formatDateTime(until)}
          </bdi>
        </div>
      )}
      {status && (
        <div className={`font-medium ${status.cls}`}>
          <bdi>{status.text}</bdi>
        </div>
      )}
    </div>
  );
}
