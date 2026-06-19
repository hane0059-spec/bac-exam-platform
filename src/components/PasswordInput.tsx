"use client";
// src/components/PasswordInput.tsx
// حقل كلمة سر مع مفتاح إظهار/إخفاء (👁). لا يكشف كلمات السر المخزَّنة (مُجزَّأة)،
// بل يُظهر ما يُكتَب الآن فقط.
import { useState } from "react";

export default function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  id,
  defaultVisible = false,
  onEnter,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  id?: string;
  defaultVisible?: boolean;
  onEnter?: () => void;
  className?: string;
}) {
  const [show, setShow] = useState(defaultVisible);
  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type={show ? "text" : "password"}
        dir="ltr"
        autoComplete={autoComplete}
        className="field pl-11"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        title={show ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
        aria-label={show ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg px-1.5 py-1 text-ink/50 transition hover:bg-ink/5 hover:text-ink"
      >
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}
