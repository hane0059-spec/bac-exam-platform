"use client";
// src/components/LoginForm.tsx
// نموذج الدخول — كامل المحتوى المرئيّ تتحكّم به هوية المنصّة (Branding)
// التي يضبطها المدير العام من /admin/settings.
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import PasswordInput from "@/components/PasswordInput";
import BrandLogo from "@/components/BrandLogo";
import { QUOTE_SIZE_CLASS, type Branding } from "@/lib/brandingShared";

type RoleKey = "STUDENT" | "TEACHER" | "ADMIN" | "PARENT";

interface RoleWindow {
  key: RoleKey;
  title: string;
  subtitle: string;
  hint: string;
  placeholder: string;
  icon: string;
  accent: string; // لون دائرة الأيقونة (متناسق مع العلامة، آمن للوضع الليلي)
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
    accent: "bg-primary/10 text-primary ring-primary/20",
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
    accent: "bg-gold/15 text-gold ring-gold/25",
    forgot: "راجع إدارة مؤسّستك (المدير) لإعادة تعيين كلمة سرّك.",
  },
  {
    key: "ADMIN",
    title: "دخول المدراء",
    subtitle: "مدير المؤسّسة والمدير العام",
    hint: "البريد الإلكتروني",
    placeholder: "admin@example.com",
    icon: "🛡️",
    accent: "bg-ink/10 text-ink ring-ink/20",
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
    accent: "bg-primary/10 text-primary-dark ring-primary/20",
    forgot: "راجع إدارة مؤسّسة ابنك لإعادة تعيين كلمة سرّك.",
  },
];

export default function LoginForm({ branding }: { branding: Branding }) {
  const [role, setRole] = useState<RoleWindow | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // نوافذ الدخول الظاهرة حسب إعدادات المدير العام.
  const visible: Record<RoleKey, boolean> = {
    STUDENT: branding.showStudentLogin,
    TEACHER: branding.showTeacherLogin,
    ADMIN: branding.showAdminLogin,
    PARENT: branding.showParentLogin,
  };
  const windows = WINDOWS.filter((w) => visible[w.key]);
  const isList = branding.windowsLayout === "list";

  const hasContact = branding.contactEmail || branding.contactPhone;
  const hasFooterInfo = hasContact || branding.about;

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
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 py-10">
      {/* توهّج خلفيّ ناعم أعلى الصفحة لإضفاء حيويّة */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/5 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl"
      />

      <div className="absolute left-4 top-4">
        <ThemeToggle />
      </div>

      {/* بانر الصيانة (أبرز) أو الملاحظة العامّة */}
      {branding.maintenance ? (
        <div className="mb-6 w-full max-w-md rounded-2xl border border-amber-400 bg-amber-50 px-4 py-3 text-center text-sm font-medium leading-relaxed text-amber-900">
          🛠️ {branding.maintenanceMessage}
        </div>
      ) : (
        branding.notice && (
          <div
            className={`mb-6 w-full max-w-md rounded-2xl border px-4 py-3 text-center text-sm font-medium leading-relaxed ${
              branding.noticeType === "warning"
                ? "border-amber-400 bg-amber-50 text-amber-900"
                : "border-primary/30 bg-primary-light text-primary-dark"
            }`}
          >
            {branding.notice}
          </div>
        )
      )}

      {/* المحتوى المركزي */}
      <div className="flex w-full flex-1 items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-9 text-center">
            <div className="relative mx-auto mb-5 flex justify-center">
              <span
                aria-hidden
                className="absolute top-1/2 left-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/20 blur-2xl"
              />
              <div className="relative shadow-card rounded-[22px]">
                <BrandLogo size={76} hasLogo={branding.hasLogo} />
              </div>
            </div>
            <h1
              className="text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl"
              style={{ fontFamily: "var(--font-reem)" }}
            >
              {branding.name}
            </h1>
            {branding.showTagline && branding.tagline && (
              <p className="mt-2.5 text-base font-semibold tracking-wide text-gold">
                {branding.tagline}
              </p>
            )}
            <p className="mt-3 text-sm text-ink/55">
              {role ? role.subtitle : "اختر نافذة الدخول المناسبة لك"}
            </p>
          </div>

          {!role ? (
            // اختيار النافذة حسب الدور.
            <div
              className={
                isList ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"
              }
            >
              {windows.map((w) => (
                <button
                  key={w.key}
                  onClick={() => pick(w)}
                  className={`card group relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg ${
                    isList
                      ? "flex flex-row items-center gap-4 text-right"
                      : "flex flex-col items-center gap-3 text-center"
                  }`}
                >
                  <span
                    className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl text-3xl ring-1 transition group-hover:scale-105 ${w.accent}`}
                    aria-hidden
                  >
                    {w.icon}
                  </span>
                  <span
                    className={
                      isList ? "flex min-w-0 flex-col" : "flex flex-col items-center"
                    }
                  >
                    <span className="font-display font-bold">{w.title}</span>
                    <span className="text-xs text-ink/50">{w.subtitle}</span>
                  </span>
                  {isList && (
                    <span className="mr-auto text-primary opacity-0 transition group-hover:opacity-100">
                      ←
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            // نموذج الدخول للنافذة المختارة.
            <div className="card p-7">
              <div className="mb-5 flex items-center justify-between">
                <span className="flex items-center gap-3 font-display font-bold">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ring-1 ${role.accent}`}
                    aria-hidden
                  >
                    {role.icon}
                  </span>
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
      </div>

      {/* التذييل: الحكمة + التواصل + عن المنصّة */}
      <footer className="mt-10 w-full max-w-md text-center">
        {branding.showQuote && branding.quote && (
          <>
            {/* فاصل زخرفيّ */}
            <div className="mb-4 flex items-center justify-center gap-3 text-gold/70">
              <span className="h-px w-12 bg-gradient-to-l from-gold/40 to-transparent" />
              <span className="text-base" aria-hidden>
                ✦
              </span>
              <span className="h-px w-12 bg-gradient-to-r from-gold/40 to-transparent" />
            </div>
            <p
              className={`leading-loose text-ink/80 ${QUOTE_SIZE_CLASS[branding.quoteSize]}`}
              style={{ fontFamily: "var(--font-amiri)" }}
            >
              <span className="text-gold/50" aria-hidden>
                ❝
              </span>{" "}
              {branding.quote}{" "}
              <span className="text-gold/50" aria-hidden>
                ❞
              </span>
            </p>
          </>
        )}

        {hasFooterInfo && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowAbout((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/60 px-4 py-1.5 text-xs font-medium text-ink/70 transition hover:bg-ink/5"
            >
              <span aria-hidden>ℹ️</span>
              {showAbout ? "إخفاء معلومات المنصّة" : "عن المنصّة والتواصل"}
            </button>
            {showAbout && (
              <div className="mt-3 space-y-2 rounded-xl border border-line bg-surface/60 p-4 text-right text-sm leading-relaxed text-ink/70">
                {branding.about && (
                  <p className="whitespace-pre-line">{branding.about}</p>
                )}
                {hasContact && (
                  <div className="space-y-1 border-t border-line pt-2">
                    {branding.contactEmail && (
                      <p>
                        <span className="font-medium text-ink">📧 البريد: </span>
                        <a
                          href={`mailto:${branding.contactEmail}`}
                          dir="ltr"
                          className="text-primary hover:underline"
                        >
                          {branding.contactEmail}
                        </a>
                      </p>
                    )}
                    {branding.contactPhone && (
                      <p>
                        <span className="font-medium text-ink">📞 الهاتف: </span>
                        <a
                          href={`tel:${branding.contactPhone}`}
                          dir="ltr"
                          className="text-primary hover:underline"
                        >
                          {branding.contactPhone}
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </footer>
    </main>
  );
}
