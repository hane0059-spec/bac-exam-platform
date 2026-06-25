// src/components/DashboardShell.tsx
import Link from "next/link";
import { roleLabel, welcome } from "@/lib/gender";
import { dashboardPath, type SessionData } from "@/lib/auth";
import { unreadCount } from "@/lib/notifications";
import { getBranding } from "@/lib/branding";
import LogoutButton from "./LogoutButton";
import TextSizeControl from "./TextSizeControl";
import ThemeToggle from "./ThemeToggle";
import BrandLogo from "./BrandLogo";

export default async function DashboardShell({
  session,
  children,
}: {
  session: SessionData;
  children: React.ReactNode;
}) {
  const fullName = `${session.firstName} ${session.lastName}`;
  const label = roleLabel(session.role, session.gender);
  const [unread, branding] = await Promise.all([
    unreadCount(session.sub).catch(() => 0),
    getBranding(),
  ]);
  // إعلان عامّ يُعرض أعلى كل لوحة: الصيانة أبرز، وإلا الملاحظة.
  const banner = branding.maintenance
    ? { text: `🛠️ ${branding.maintenanceMessage}`, warn: true }
    : branding.notice
      ? { text: branding.notice, warn: branding.noticeType === "warning" }
      : null;

  return (
    <div className="min-h-screen">
      {banner && (
        <div
          className={`px-4 py-2 text-center text-sm font-medium leading-relaxed print:hidden ${
            banner.warn
              ? "bg-amber-100 text-amber-900"
              : "bg-primary-light text-primary-dark"
          }`}
        >
          {banner.text}
        </div>
      )}
      <header className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-4">
          <Link
            href={dashboardPath(session.role)}
            className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-ink/5 sm:gap-3"
            title="الصفحة الرئيسية"
          >
            <BrandLogo size={36} hasLogo={branding.hasLogo} />
            <div>
              <p className="text-xs text-ink/60 sm:text-sm">{label}</p>
              <p className="font-display text-base font-bold leading-tight sm:text-lg">
                {fullName}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* روابط ثانوية — مخفية على الموبايل */}
            <Link
              href={dashboardPath(session.role)}
              className="hidden rounded-xl border border-line px-3 py-2 text-sm font-medium transition hover:bg-ink/5 sm:inline-flex"
            >
              الرئيسية
            </Link>
            <a
              href={`/guide/${session.role.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden rounded-xl border border-line px-3 py-2 text-sm font-medium transition hover:bg-ink/5 sm:inline-flex"
              title="كيف تستخدم صفحتك؟"
            >
              كيف أستخدم صفحتي؟
            </a>
            <Link
              href="/account"
              className="hidden rounded-xl border border-line px-3 py-2 text-sm font-medium transition hover:bg-ink/5 sm:inline-flex"
              title="حسابي وكلمة السر"
            >
              حسابي
            </Link>
            {/* أيقونات دائمة الظهور */}
            <Link
              href="/notifications"
              title="الإشعارات"
              className="relative rounded-xl border border-line px-2.5 py-2 text-sm font-medium transition hover:bg-ink/5 sm:px-3"
            >
              <span aria-hidden>🔔</span>
              {unread > 0 && (
                <span className="absolute -top-1.5 -left-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <TextSizeControl />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        {/* شريط تنقّل موبايل — يظهر فقط على الشاشات الصغيرة */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-line px-3 py-1.5 sm:hidden">
          <Link
            href={dashboardPath(session.role)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
          >
            الرئيسية
          </Link>
          <Link
            href="/account"
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
          >
            حسابي
          </Link>
          <a
            href={`/guide/${session.role.toLowerCase()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
          >
            الدليل
          </a>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
        <div className="mb-5 print:hidden sm:mb-8">
          <h1 className="font-display text-2xl font-bold">
            {welcome(session.gender)}، {session.firstName}
          </h1>
          <p className="mt-1 text-ink/60">
            {
              ({
                STUDENT: "لوحة متابعة اختباراتك ونتائجك",
                TEACHER: "لوحة إدارة اختباراتك وطلابك",
                ADMIN: "لوحة إدارة مستخدمي المؤسّسة",
                PARENT: "لوحة متابعة نتائج أبنائك",
              } as Record<string, string>)[session.role] ??
                "لوحة التحكّم"
            }
          </p>
        </div>
        {children}
      </main>
    </div>
  );
}

export function PlaceholderCard({
  title,
  description,
  soon = true,
}: {
  title: string;
  description: string;
  soon?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        {soon && (
          <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary-dark">
            قريباً
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-ink/60">{description}</p>
    </div>
  );
}
