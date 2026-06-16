// src/app/login/page.tsx
"use client";

import { useState } from "react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّر تسجيل الدخول");
        setLoading(false);
        return;
      }
      // إعادة تحميل كاملة ليلتقط الـ middleware الكوكي.
      window.location.href = data.redirect ?? "/";
    } catch {
      setError("تعذّر الاتصال بالخادم");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-white shadow-card">
            ع
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">
            منصة الاختبارات الإلكترونية
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            سجّل الدخول للمتابعة إلى لوحتك
          </p>
        </div>

        <div className="card p-7">
          <div className="space-y-5">
            <div>
              <label htmlFor="identifier" className="mb-1.5 block text-sm font-medium">
                البريد أو رمز الطالب أو الاسم
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                className="field"
                placeholder="name@example.com أو S-1002 أو الاسم الكامل"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                كلمة السر
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              className="btn-primary w-full"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "جارٍ الدخول…" : "تسجيل الدخول"}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-line bg-white/60 p-4 text-sm text-ink/70">
          <p className="mb-2 font-medium text-ink">حسابات تجريبية:</p>
          <ul className="space-y-1">
            <li dir="ltr" className="text-right">admin@example.com — Admin@123</li>
            <li dir="ltr" className="text-right">teacher@example.com — Teacher@123</li>
            <li dir="ltr" className="text-right">student@example.com — Student@123</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
