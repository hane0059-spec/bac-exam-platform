"use client";
// src/components/teacher/PasswordReset.tsx
// إعادة تعيين كلمة سرّ الطالب (المدرّس المُنشئ).
import { useState } from "react";
import { generateTempPassword } from "@/lib/tempPassword";
import PasswordInput from "@/components/PasswordInput";

export default function PasswordReset({ studentId }: { studentId: string }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  function genTemp() {
    setPassword(generateTempPassword());
    setGenerated(true);
    setMsg("");
    setError("");
  }

  async function submit() {
    setMsg("");
    setError("");
    setBusy(true);
    const res = await fetch(`/api/teacher/students/${studentId}/password`, {
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
    const used = password;
    setPassword("");
    setMsg(
      generated
        ? `تم التغيير. سلّم الطالب كلمته المؤقّتة: ${used}`
        : "تم تغيير كلمة السرّ."
    );
    setGenerated(false);
  }

  return (
    <div className="card max-w-2xl space-y-3 p-6">
      <h3 className="font-display font-semibold">إعادة تعيين كلمة السرّ</h3>
      <div className="flex flex-wrap items-end gap-2">
        <PasswordInput
          className="flex-1"
          defaultVisible
          value={password}
          onChange={(v) => {
            setPassword(v);
            setGenerated(false);
          }}
          placeholder="كلمة سرّ جديدة (6 أحرف على الأقل)"
        />
        <button
          type="button"
          onClick={genTemp}
          className="rounded-xl border border-line px-4 py-3 text-sm font-medium hover:bg-ink/5"
        >
          توليد مؤقّتة
        </button>
        <button
          onClick={submit}
          disabled={busy || password.length < 6}
          className="btn-primary"
        >
          تغيير
        </button>
      </div>
      {generated && (
        <p className="text-xs text-ink/50">
          كلمة سهلة للنطق — انسخها وسلّمها للطالب قبل الحفظ.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {msg && <p className="text-sm text-primary-dark">{msg}</p>}
    </div>
  );
}
