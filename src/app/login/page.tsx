// src/app/login/page.tsx
"use client";

import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import PasswordInput from "@/components/PasswordInput";

type RoleKey = "STUDENT" | "TEACHER" | "ADMIN" | "PARENT";

interface RoleWindow {
  key: RoleKey;
  title: string;
  subtitle: string;
  hint: string;
  placeholder: string;
  icon: string;
  forgot: string; // إرشاد عند نسيان كلمة السر (لا إرسال — إعادة تعيين بإشراف)
}

const WINDOWS: RoleWindow[] = [
  {
    key: "STUDENT",
    title: "دخول الطلاب",
    subtitle: "للطالبات والطلاب",
    hint: "رمز الطالب أو الاسم الكامل أو البريد",
    placeholder: "S-1002 أو الاسم الكامل",
    icon: "🎓",
    forgot:
      "راجع مدرّسك أو إدارة مؤسّستك لإعادة تعيين كلمة سرّك — يمكنهم ذلك فوراً.",
  },
  {
    key: "TEACHER",
    title: "دخول المدرّسين",
    subtitle: "للمدرّسات والمدرّسين",
    hint: "البريد أو رمز المدرّس أو الاسم",
    placeholder: "name@example.com أو T-1002",
    icon: "🧑‍🏫",
    forgot: "راجع إدارة مؤسّستك (المدير) لإعادة تعيين كلمة سرّك.",
  },
  {
    key: "ADMIN",
    title: "دخول المدراء",
    subtitle: "مدير المؤسّسة والمدير العام",
    hint: "البريد الإلكتروني",
    placeholder: "admin@example.com",
    icon: "🛡️",
    forgot:
      "مدير المؤسّسة: راجع المدير العام للمنصّة. المدير العام: راجع مسؤول النظام.",
  },
  {
    key: "PARENT",
    title: "دخول أولياء الأمور",
    subtitle: "لمتابعة نتائج الأبناء",
    hint: "البريد أو الاسم الكامل",
    placeholder: "name@example.com أو الاسم الكامل",
    icon: "👪",
    forgot: "راجع إدارة مؤسّسة ابنك لإعادة تعيين كلمة سرّك.",
  },
];

export default function LoginPage() {
  const [role, setRole] = useState<RoleWindow | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  function pick(w: RoleWindow) {
    setRole(w);
    setIdentifier("");
    setPassword("");
    setError(null);
    setShowForgot(false);
  }

  async function handleSubmit() {
    if (!role) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, role: role.key }),
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
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute left-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-white shadow-card">
            ع
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">
            منصة الاختبارات الإلكترونية
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            {role ? role.subtitle : "اختر نافذة الدخول المناسبة لك"}
          </p>
        </div>

        {!role ? (
          // اختيار النافذة حسب الدور.
          <div className="grid grid-cols-2 gap-3">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                onClick={() => pick(w)}
                className="card flex flex-col items-center gap-2 p-5 text-center transition hover:border-primary/40"
              >
                <span className="text-3xl" aria-hidden>
                  {w.icon}
                </span>
                <span className="font-display font-semibold">{w.title}</span>
                <span className="text-xs text-ink/50">{w.subtitle}</span>
              </button>
            ))}
          </div>
        ) : (
          // نموذج الدخول للنافذة المختارة.
          <div className="card p-7">
            <div className="mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2 font-display font-semibold">
                <span aria-hidden>{role.icon}</span>
                {role.title}
              </span>
              <button
                onClick={() => setRole(null)}
                className="text-sm text-primary hover:underline"
              >
                تغيير النافذة
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="identifier"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {role.hint}
                </label>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  className="field"
                  placeholder={role.placeholder}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium"
                >
                  كلمة السر
                </label>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={setPassword}
                  onEnter={handleSubmit}
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

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgot((v) => !v)}
                  className="text-sm text-primary hover:underline"
                >
                  نسيت كلمة السر؟
                </button>
                {showForgot && (
                  <p className="mt-2 rounded-xl border border-line bg-surface/60 p-3 text-sm leading-relaxed text-ink/70">
                    {role.forgot}
                  </p>
                )}
              </div>

              {role.key === "ADMIN" && (
                <div className="rounded-xl border border-line bg-surface/60 p-3 text-sm text-ink/70">
                  <p className="mb-1 font-medium text-ink">حساب المدير العام:</p>
                  <p dir="ltr" className="text-right">
                    admin@example.com — Admin@123
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
