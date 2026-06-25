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
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link
            href={dashboardPath(session.role)}
            className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-ink/5"
            title="الصفحة الرئيسية"
          >
            <BrandLogo size={40} hasLogo={branding.hasLogo} />
            <div>
              <p className="text-sm text-ink/60">{label}</p>
              <p className="font-display text-lg font-bold leading-tight">
                {fullName}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={dashboardPath(session.role)}
              className="rounded-xl border border-line px-3 py-2 text-sm font-medium transition hover:bg-ink/5"
            >
              الرئيسية
            </Link>
            <a
              href={`/guide/${session.role.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-line px-3 py-2 text-sm font-medium transition hover:bg-ink/5"
              title="كيف تستخدم صفحتك؟"
            >
              كيف أستخدم صفحتي؟
            </a>
            <Link
              href="/account"
              className="rounded-xl border border-line px-3 py-2 text-sm font-medium transition hover:bg-ink/5"
              title="حسابي وكلمة السر"
            >
              حسابي
            </Link>
            <Link
              href="/notifications"
              title="الإشعارات"
              className="relative rounded-xl border border-line px-3 py-2 text-sm font-medium transition hover:bg-ink/5"
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
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 print:hidden">
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
