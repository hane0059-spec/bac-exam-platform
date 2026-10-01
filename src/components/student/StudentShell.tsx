// src/components/student/StudentShell.tsx
// هيكل لوحة الطالب بتصميم Sidebar (بدل الهيدر البسيط المشترك) — خاصّ بدور الطالب فقط.
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Linkify from "@/components/Linkify";
import BrandLogo from "@/components/BrandLogo";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import TextSizeControl from "@/components/TextSizeControl";
import { Icon, type IconName } from "@/components/icons";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export default function StudentShell({
  fullName,
  studentCode,
  roleLabel,
  welcomeGreeting,
  subtitle,
  brandName,
  hasLogo,
  unread,
  banner,
  enrichmentEnabled,
  children,
}: {
  fullName: string;
  studentCode: string | null;
  roleLabel: string;
  welcomeGreeting: string;
  subtitle: string;
  brandName: string;
  hasLogo: boolean;
  unread: number;
  banner: { text: string; warn: boolean } | null;
  enrichmentEnabled: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems: NavItem[] = [
    { href: "/student", label: "الرئيسية", icon: "home" },
    { href: "/student/quizzes", label: "الاختبارات", icon: "book" },
    { href: "/student/subjects", label: "المواد", icon: "layers" },
    { href: "/student/progress", label: "التقارير", icon: "chart" },
    ...(enrichmentEnabled
      ? [{ href: "/student/enrichment", label: "المكتبة التعليمية", icon: "folder" as IconName }]
      : []),
  ];

  function isActive(href: string) {
    return href === "/student" ? pathname === "/student" : pathname.startsWith(href);
  }

  function navLinks(onNavigate?: () => void) {
    return (
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-primary-light text-primary-dark" : "text-ink/70 hover:bg-ink/5"
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
        <div className="my-2 border-t border-line" />
        <Link
          href="/account"
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
            isActive("/account") ? "bg-primary-light text-primary-dark" : "text-ink/70 hover:bg-ink/5"
          }`}
        >
          <Icon name="user" className="h-5 w-5 shrink-0" />
          حسابي
        </Link>
        <a
          href="/guide/student"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink/70 transition hover:bg-ink/5"
        >
          <Icon name="info" className="h-5 w-5 shrink-0" />
          كيف أستخدم صفحتي؟
        </a>
      </nav>
    );
  }

  const profileCard = (
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-2.5 rounded-xl bg-parchment px-3 py-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
          <Icon name="user" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{fullName}</p>
          <p className="truncate text-xs text-ink/55">
            {roleLabel}
            {studentCode && (
              <bdi dir="ltr" className="mr-1">
                · {studentCode}
              </bdi>
            )}
          </p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <TextSizeControl />
        </div>
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {banner && (
        <div
          className={`px-4 py-2 text-center text-sm font-medium leading-relaxed print:hidden ${
            banner.warn ? "bg-amber-100 text-amber-900" : "bg-primary-light text-primary-dark"
          }`}
        >
          <Linkify text={banner.text} />
        </div>
      )}

      <div className="lg:flex">
        {/* Sidebar — الحاسوب */}
        <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-l lg:border-line lg:bg-surface print:hidden">
          <Link href="/student" className="flex items-center gap-2.5 border-b border-line px-4 py-4">
            <BrandLogo size={34} hasLogo={hasLogo} />
            <span className="font-display text-lg font-bold leading-tight">{brandName}</span>
          </Link>
          {navLinks()}
          {profileCard}
        </aside>

        {/* درج الموبايل */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-2xl">
              <div className="flex items-center justify-between border-b border-line px-4 py-4">
                <Link href="/student" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2.5">
                  <BrandLogo size={30} hasLogo={hasLogo} />
                  <span className="font-display text-base font-bold">{brandName}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-ink/60 transition hover:bg-ink/5"
                  title="إغلاق"
                >
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>
              {navLinks(() => setDrawerOpen(false))}
              {profileCard}
            </aside>
          </div>
        )}

        {/* المحتوى */}
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-3 sm:px-4 lg:justify-end print:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="rounded-xl border border-line p-2 text-ink/70 transition hover:bg-ink/5 lg:hidden"
              title="القائمة"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
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
          </header>

          <main className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
            <div className="mb-5 flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-dark px-5 py-6 text-white shadow-card print:hidden sm:mb-8 sm:px-8 sm:py-7">
              <div>
                <h1 className="font-display text-xl font-bold sm:text-2xl">{welcomeGreeting}</h1>
                <p className="mt-1.5 text-sm text-white/85 sm:mt-2 sm:text-base">{subtitle}</p>
                {studentCode && (
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1 text-xs sm:text-sm">
                    رمزك:{" "}
                    <bdi dir="ltr" className="font-bold">
                      {studentCode}
                    </bdi>
                  </p>
                )}
              </div>
              <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:flex lg:h-20 lg:w-20">
                <Icon name="cap" className="h-8 w-8 text-white lg:h-9 lg:w-9" />
              </div>
            </div>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
