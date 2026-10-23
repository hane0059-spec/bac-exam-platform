"use client";
// src/components/ChangePasswordForm.tsx
// تغيير المستخدم كلمة سرّه بنفسه (الحالية + الجديدة + تأكيد).
import { useState } from "react";
import PasswordInput from "@/components/PasswordInput";

export default function ChangePasswordForm({
  forced = false,
  nextPath,
}: {
  /** كلمة سرّ مؤقّتة: تنبيه بارز + توجيه للوحة بعد النجاح. */
  forced?: boolean;
  nextPath?: string;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;

  async function submit() {
    setError("");
    setDone(false);
    if (next !== confirm) {
      setError("تأكيد كلمة السر لا يطابق.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "تعذّر التغيير.");
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    setDone(true);
    if (forced && nextPath) {
      window.location.href = nextPath;
    }
  }

  return (
    <div className="card max-w-md space-y-3 p-6">
      <h3 className="font-display font-semibold">تغيير كلمة السرّ</h3>
      {forced && (
        <p className="rounded-xl bg-gold/15 p-3 text-sm leading-relaxed text-gold">
          كلمة سرّك الحالية مؤقّتة (من بطاقة الدخول). اختر كلمة سرّ جديدة تعرفها
          أنت وحدك قبل متابعة استخدام المنصّة.
        </p>
      )}
      <div>
        <label className="mb-1 block text-sm text-ink/60">كلمة السر الحالية</label>
        <PasswordInput value={current} onChange={setCurrent} autoComplete="current-password" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-ink/60">كلمة السر الجديدة</label>
        <PasswordInput value={next} onChange={setNext} autoComplete="new-password" />
      </div>
      <div>
        <label className="mb-1 block text-sm text-ink/60">تأكيد كلمة السر الجديدة</label>
        <PasswordInput value={confirm} onChange={setConfirm} onEnter={submit} autoComplete="new-password" />
        {mismatch && <p className="mt-1 text-xs text-red-600">لا يطابق.</p>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm text-primary-dark">تم تغيير كلمة السرّ ✓</p>}

      <button
        onClick={submit}
        disabled={
          busy || current.length < 1 || next.length < 6 || next !== confirm
        }
        className="btn-primary"
      >
        حفظ
      </button>
    </div>
  );
}
