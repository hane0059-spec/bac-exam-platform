// src/components/DashboardShell.tsx
import Linkify from "@/components/Linkify";
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
          <Linkify text={banner.text} />
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
            {/* الإشعارات — دائمة */}
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
            {/* TextSizeControl — مخفي على الموبايل (متاح في شريط التنقّل) */}
            <div className="hidden sm:block"><TextSizeControl /></div>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        {/* شريط تنقّل موبايل — يظهر فقط على الشاشات الصغيرة */}
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-line px-2 py-1 sm:hidden">
          <Link
            href={dashboardPath(session.role)}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
          >
            الرئيسية
          </Link>
          <Link
            href="/account"
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
          >
            حسابي
          </Link>
          <a
            href={`/guide/${session.role.toLowerCase()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
          >
            الدليل
          </a>
          {/* TextSizeControl في شريط الموبايل بدلاً من الهيدر */}
          <div className="mr-auto shrink-0 scale-90"><TextSizeControl /></div>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
        <div className="mb-5 flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-dark px-5 py-6 text-white shadow-card print:hidden sm:mb-8 sm:px-8 sm:py-7">
          <div>
            <h1 className="font-display text-xl font-bold sm:text-2xl">
              {welcome(session.gender)}، {session.firstName}
            </h1>
            <p className="mt-1.5 text-sm text-white/85 sm:mt-2 sm:text-base">
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
          <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:flex lg:h-20 lg:w-20">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-white lg:h-9 lg:w-9"
            >
              <path d="M12 5 21 9.5 12 14 3 9.5 12 5Z" />
              <path d="M7 11.5v4c0 1.2 2.2 2.3 5 2.3s5-1.1 5-2.3v-4" />
              <path d="M21 9.5v5" />
            </svg>
          </div>
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
