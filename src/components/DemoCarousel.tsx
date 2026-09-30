"use client";
// src/components/DemoCarousel.tsx
// عرض متحرّك (Carousel) لـ3 مشاهد توضيحية مرسومة (Mockup) — لا بيانات حقيقية ولا
// حساب فعلي، فقط لإعطاء الزائر فكرة بصرية سريعة عن تجربة أداء الاختبار.
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";

const FRAMES = ["list", "question", "result"] as const;
type Frame = (typeof FRAMES)[number];

const CAPTIONS: Record<Frame, string> = {
  list: "اختر اختبارك من قائمتك",
  question: "أجب عن الأسئلة بسهولة",
  result: "احصل على نتيجتك وتحليلك فوراً",
};

function DeviceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex items-center gap-1.5 border-b border-line bg-ink/[0.03] px-3 py-1.5">
        <span className="h-2 w-2 rounded-full bg-red-400/70" />
        <span className="h-2 w-2 rounded-full bg-gold/70" />
        <span className="h-2 w-2 rounded-full bg-primary/50" />
      </div>
      <div className="p-4" dir="rtl">
        {children}
      </div>
    </div>
  );
}

function ListMock() {
  return (
    <div className="space-y-2">
      {[
        { title: "اختبار الخلية", sub: "علم الأحياء · 20 سؤال", tone: "primary" as const },
        { title: "اختبار المعادلات", sub: "الرياضيات · 15 سؤال", tone: "gold" as const },
      ].map((q) => (
        <div key={q.title} className="flex items-center justify-between rounded-xl border border-line p-2.5">
          <div>
            <p className="text-xs font-bold sm:text-sm">{q.title}</p>
            <p className="text-[10px] text-ink/50 sm:text-xs">{q.sub}</p>
          </div>
          <span
            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold text-white sm:text-xs ${
              q.tone === "primary" ? "bg-primary" : "bg-gold"
            }`}
          >
            ابدأ
          </span>
        </div>
      ))}
    </div>
  );
}

function QuestionMock() {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[10px] text-ink/50 sm:text-xs">
        <span>السؤال 3 من 5</span>
        <span>⏱ 08:42</span>
      </div>
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
        <div className="h-full w-3/5 rounded-full bg-primary" />
      </div>
      <p className="mb-2.5 text-xs font-medium leading-relaxed sm:text-sm">
        أيّ من الآتي يمثّل الوحدة الأساسية للحياة؟
      </p>
      <div className="space-y-1.5">
        {["النسيج", "العضو", "الخلية", "الجهاز"].map((opt) => (
          <div
            key={opt}
            className={`rounded-lg border px-2.5 py-1.5 text-[11px] sm:text-xs ${
              opt === "الخلية"
                ? "border-primary bg-primary-light font-bold text-primary-dark"
                : "border-line text-ink/70"
            }`}
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultMock() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-primary text-center">
        <span className="font-display text-lg font-bold text-primary-dark">92%</span>
      </div>
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-ink/70 sm:text-xs">
          <Icon name="check" className="h-3.5 w-3.5 text-primary" />
          18 إجابة صحيحة
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-ink/70 sm:text-xs">
          <Icon name="alert" className="h-3.5 w-3.5 text-red-400" />
          2 إجابة خاطئة
        </div>
        <div className="flex items-end gap-1 pt-1">
          <span className="h-4 w-2.5 rounded-sm bg-primary/40" />
          <span className="h-6 w-2.5 rounded-sm bg-primary/60" />
          <span className="h-8 w-2.5 rounded-sm bg-primary" />
        </div>
      </div>
    </div>
  );
}

export default function DemoCarousel() {
  const [active, setActive] = useState(0);
  const hovering = useRef(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = setInterval(() => {
      if (!hovering.current) setActive((i) => (i + 1) % FRAMES.length);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const frame = FRAMES[active];

  return (
    <section className="py-2">
      <h2 className="mb-2 text-center text-sm font-semibold text-ink/70">شاهد كيف تبدو تجربة الاختبار</h2>
      <div
        onMouseEnter={() => (hovering.current = true)}
        onMouseLeave={() => (hovering.current = false)}
      >
        <DeviceFrame>
          <div key={frame} className="animate-fade-up">
            {frame === "list" && <ListMock />}
            {frame === "question" && <QuestionMock />}
            {frame === "result" && <ResultMock />}
          </div>
        </DeviceFrame>
        <div className="mt-2 flex flex-col items-center gap-1.5">
          <p className="text-[11px] text-ink/50 sm:text-xs">{CAPTIONS[frame]}</p>
          <div className="flex items-center gap-1.5">
            {FRAMES.map((f, i) => (
              <button
                key={f}
                type="button"
                aria-label={CAPTIONS[f]}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === active ? "w-5 bg-primary" : "w-1.5 bg-ink/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
