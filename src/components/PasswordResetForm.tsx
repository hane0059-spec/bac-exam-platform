"use client";
// src/components/PasswordResetForm.tsx
// إعادة تعيين كلمة سرّ عبر نقطة نهاية مُمرَّرة.
import { useState } from "react";

export default function PasswordResetForm({ endpoint }: { endpoint: string }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function submit() {
    setMsg("");
    setError("");
    setBusy(true);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "تعذّر التغيير.");
      return;
    }
    setPassword("");
    setMsg("تم تغيير كلمة السرّ.");
  }

  return (
    <div className="card max-w-2xl space-y-3 p-6">
      <h3 className="font-display font-semibold">إعادة تعيين كلمة السرّ</h3>
      <div className="flex flex-wrap items-end gap-2">
        <input
          type="text"
          dir="ltr"
          className="field flex-1"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة سرّ جديدة (6 أحرف على الأقل)"
        />
        <button
          onClick={submit}
          disabled={busy || password.length < 6}
          className="btn-primary"
        >
          تغيير
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-primary-dark">{msg}</p>}
    </div>
  );
}
