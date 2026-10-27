"use client";
// src/components/student/MatchingPicker.tsx
// مطابقة الطالب بجدولين متقابلين (كالورقة المطبوعة): اضغط عنصراً من العمود الأوّل (مرقَّم) ثم ما يناسبه من
// العمود الثاني (بحروف). يُلوَّن كل زوج بلون واحد على الجهتين، ويمكن إعادة الربط أو فكّه.
// الإجابة تُحفَظ بالصيغة نفسها (نصّ أيمن لكل أيسر) فلا يتغيّر الخادم.
import { useState } from "react";
import MathText from "@/components/MathText";
import { stripLeadingEnumerator } from "@/lib/matchingPrint";
import { assignMatch, clearMatch, nextUnmatched, ownerOf } from "@/lib/matchingUi";
import { defaultOptionLetter, type Lang } from "@/lib/textDir";

const PAIR_COLORS = ["#0f766e", "#b45309", "#6d28d9", "#be123c", "#1d4ed8", "#4d7c0f", "#a21caf", "#c2410c"];

export default function MatchingPicker({
  lefts,
  rights,
  value,
  onChange,
  disabled,
  lang,
}: {
  lefts: { id: string; text: string }[];
  rights: string[];
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  lang: Lang;
}) {
  const [active, setActive] = useState<number | null>(() => (value.length ? nextUnmatched(value, -1) : null));
  const rows = Math.max(lefts.length, rights.length);

  function pickLeft(i: number) {
    if (disabled) return;
    setActive((a) => (a === i ? null : i));
  }

  function pickRight(k: number) {
    if (disabled) return;
    const text = rights[k];
    if (active !== null) {
      const next = assignMatch(value, active, text);
      onChange(next);
      setActive(nextUnmatched(next, active));
    } else {
      const owner = ownerOf(value, text);
      if (owner >= 0) setActive(owner); // اضغط أيمنَ مرتبطاً ← يحدّد عنصره الأيسر لإعادة ربطه
    }
  }

  const colorOf = (i: number) => PAIR_COLORS[i % PAIR_COLORS.length];

  return (
    <div>
      <p className="mb-3 text-sm text-ink/60">
        اضغط عنصراً من العمود الأوّل، ثم اضغط ما يناسبه من العمود الثاني.
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:gap-x-10">
        {Array.from({ length: rows }, (_, i) => {
          const left = lefts[i];
          const rightText = rights[i];
          const chosen = left ? value[i] ?? "" : "";
          const chosenIdx = chosen ? rights.indexOf(chosen) : -1;
          const owner = rightText ? ownerOf(value, rightText) : -1;
          const isActive = active === i;
          return (
            <div key={i} className="contents">
              {left ? (
                <div
                  className={`flex min-w-0 items-center gap-2 rounded-xl border p-2.5 text-start transition ${
                    isActive
                      ? "border-primary bg-primary-light ring-2 ring-primary/40"
                      : chosen
                      ? "border-ink/30 bg-surface"
                      : "border-line bg-surface hover:border-primary/40"
                  } ${disabled ? "opacity-70" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => pickLeft(i)}
                    disabled={disabled}
                    aria-pressed={isActive}
                    className="flex min-w-0 flex-1 items-center gap-2 text-start"
                  >
                    <span className="shrink-0 font-bold text-ink/55">{i + 1}.</span>
                    <span dir="auto" className="min-w-0 flex-1 break-words text-sm leading-snug">
                      <MathText text={stripLeadingEnumerator(left.text)} />
                    </span>
                  </button>
                  {chosenIdx >= 0 && (
                    <>
                      <span
                        className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
                        style={{ background: colorOf(i) }}
                        aria-label={`مرتبط بالخيار ${defaultOptionLetter(chosenIdx, lang)}`}
                      >
                        {defaultOptionLetter(chosenIdx, lang)}
                      </span>
                      {!disabled && (
                        <button
                          type="button"
                          onClick={() => onChange(clearMatch(value, i))}
                          className="shrink-0 px-1 text-ink/40 hover:text-red-600"
                          aria-label="فكّ الربط"
                        >
                          ✕
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div />
              )}
              {rightText !== undefined ? (
                <button
                  type="button"
                  onClick={() => pickRight(i)}
                  disabled={disabled}
                  className={`flex min-w-0 items-center gap-2 rounded-xl border p-2.5 text-start transition ${
                    owner >= 0
                      ? "border-ink/30 bg-surface"
                      : active !== null
                      ? "border-dashed border-primary/60 bg-surface hover:bg-primary-light"
                      : "border-line bg-surface"
                  } ${disabled ? "opacity-70" : ""}`}
                >
                  <span className="shrink-0 font-bold text-ink/55">{defaultOptionLetter(i, lang)}.</span>
                  <span dir="auto" className="min-w-0 flex-1 break-words text-sm leading-snug">
                    <MathText text={stripLeadingEnumerator(rightText)} />
                  </span>
                  {owner >= 0 && (
                    <span
                      className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1 text-xs font-bold text-white"
                      style={{ background: colorOf(owner) }}
                      aria-label={`مرتبط بالعنصر ${owner + 1}`}
                    >
                      {owner + 1}
                    </span>
                  )}
                </button>
              ) : (
                <div />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
