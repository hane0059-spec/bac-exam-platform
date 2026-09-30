"use client";
// src/components/LandingPage.tsx
// الصفحة الرئيسية العامّة (Landing) لزوّار غير مسجَّلين — تسويقية بحتة، بلا أي
// بيانات مستخدمين أو اختبارات حقيقية. الدخول الفعلي يبقى بالكامل في /login.
// مكثّفة عمداً (بلا فراغات كبيرة) لتظهر بكاملها بأقلّ تمرير ممكن.
import { useState } from "react";
import Link from "next/link";
import Linkify from "@/components/Linkify";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";
import TextSizeControl from "@/components/TextSizeControl";
import FamilyIcon from "@/components/icons/FamilyIcon";
import { Icon, type IconName } from "@/components/icons";
import DemoCarousel from "@/components/DemoCarousel";
import type { Branding } from "@/lib/brandingShared";

const ROLE_CARDS: {
  role: string;
  title: string;
  icon: IconName | "family";
  bar: string;
  accent: string;
}[] = [
  { role: "STUDENT", title: "الطلاب والطالبات", icon: "cap", bar: "bg-primary", accent: "bg-primary-light text-primary" },
  { role: "TEACHER", title: "المدرّسون والمدرّسات", icon: "teach", bar: "bg-gold", accent: "bg-gold/15 text-gold" },
  { role: "ADMIN", title: "المديرون", icon: "shield", bar: "bg-ink/70", accent: "bg-ink/10 text-ink" },
  { role: "PARENT", title: "أولياء الأمور", icon: "family", bar: "bg-primary-dark", accent: "bg-primary/10 text-primary-dark" },
];

const FEATURES: { icon: IconName; title: string }[] = [
  { icon: "layers", title: "إنشاء الاختبارات" },
  { icon: "book", title: "بنك الأسئلة" },
  { icon: "check", title: "التصحيح التلقائي" },
  { icon: "chart", title: "تحليل النتائج" },
  { icon: "clock", title: "متابعة الأداء" },
  { icon: "share", title: "مشاركة الاختبار" },
];

// عناصر تنقّل غير مفعّلة بعد (صفحاتها غير مبنيّة) — تُعرَض بصرياً فقط تمهيداً
// لربطها لاحقاً، بلا روابط ميتة تضلّل الزائر.
const SOON_NAV = ["الاختبارات", "بنك الأسئلة", "المواد"];

function HeroIllustration() {
  return (
    <svg viewBox="0 0 360 300" className="h-auto w-full max-w-[170px] sm:max-w-[200px] lg:max-w-[230px]" aria-hidden>
      <rect x="20" y="170" width="320" height="110" rx="28" className="fill-primary/5" />
      <path d="M60 230 C100 214 140 214 178 226 V 250 C140 238 100 238 60 254 Z" className="fill-surface stroke-primary/40" strokeWidth="2" />
      <path d="M178 226 C216 214 256 214 296 230 V 254 C256 238 216 238 178 250 Z" className="fill-surface stroke-primary/40" strokeWidth="2" />
      <path d="M178 226 V 250" className="stroke-primary/30" strokeWidth="2" />
      <g strokeLinecap="round" fill="none">
        <path d="M150 190 C170 170 130 150 150 130 C170 110 130 90 150 70" className="stroke-gold" strokeWidth="4" />
        <path d="M182 190 C162 170 202 150 182 130 C162 110 202 90 182 70" className="stroke-gold/50" strokeWidth="4" />
        <path d="M152 176 H180 M152 150 H180 M152 124 H180 M152 98 H180" className="stroke-gold/70" strokeWidth="3" />
      </g>
      <g className="fill-primary">
        <rect x="235" y="160" width="14" height="34" rx="3" opacity="0.55" />
        <rect x="256" y="140" width="14" height="54" rx="3" opacity="0.75" />
        <rect x="277" y="120" width="14" height="74" rx="3" />
      </g>
      <circle cx="295" cy="95" r="26" className="fill-gold" />
      <path d="M284 96 l8 8 16 -17" fill="none" className="stroke-surface" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="55" cy="90" r="3" className="fill-gold/60" />
      <circle cx="85" cy="60" r="2" className="fill-primary/50" />
      <circle cx="200" cy="55" r="2.5" className="fill-gold/50" />
    </svg>
  );
}

export default function LandingPage({
  branding,
  nameFontCss,
}: {
  branding: Branding;
  nameFontCss: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const banner = branding.maintenance
    ? { text: `🛠️ ${branding.maintenanceMessage}`, warn: true }
    : branding.notice
      ? { text: branding.notice, warn: branding.noticeType === "warning" }
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      {banner && (
        <div
          className={`px-4 py-1.5 text-center text-xs font-medium leading-relaxed sm:text-sm ${
            banner.warn ? "bg-amber-100 text-amber-900" : "bg-primary-light text-primary-dark"
          }`}
        >
          <Linkify text={banner.text} />
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo size={32} hasLogo={branding.hasLogo} />
            <span className="font-display text-base font-bold" style={{ fontFamily: nameFontCss }}>
              {branding.name}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            <span className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary">الرئيسية</span>
            {SOON_NAV.map((label) => (
              <span key={label} title="قريباً" className="cursor-default rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink/40">
                {label}
              </span>
            ))}
            <a href="#about" className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink/70 transition hover:bg-ink/5">
              عن المنصّة
            </a>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            <Link href="/login" className="btn-primary px-4 py-1.5 text-sm">
              تسجيل الدخول
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="القائمة"
            className="rounded-lg border border-line p-1.5 lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5">
              {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-line px-4 py-2 lg:hidden">
            <div className="flex flex-col gap-0.5">
              <span className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary">الرئيسية</span>
              {SOON_NAV.map((label) => (
                <span key={label} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink/40">
                  {label} <span className="text-xs">(قريباً)</span>
                </span>
              ))}
              <a href="#about" className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink/70">
                عن المنصّة
              </a>
              <div className="mt-1 flex items-center gap-2 border-t border-line pt-2">
                <ThemeToggle />
                <TextSizeControl />
              </div>
              <Link href="/login" className="btn-primary mt-1 w-full text-center">
                تسجيل الدخول
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-2">
        {/* Hero + بطاقات الدخول معاً في كتلة واحدة مضغوطة */}
        <section className="grid items-center gap-3 py-2 lg:grid-cols-5 lg:gap-6">
          <div className="animate-fade-up text-center lg:col-span-3 lg:text-right">
            <h1 className="font-display text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
              اختبر معرفتك...{" "}
              <span className="bg-gradient-to-l from-primary to-gold bg-clip-text text-transparent">
                وطوّر مستواك
              </span>
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink/70 lg:mx-0">
              منصّة {branding.name} تمنحك تجربة متكاملة لإنشاء الاختبارات وحلّها وتحليل النتائج ومتابعة التقدّم.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
              <Link href="/login" className="btn-primary px-5 py-2 text-sm">
                ابدأ الآن
              </Link>
              <a href="#roles" className="rounded-xl border border-line px-5 py-2 text-sm font-medium transition hover:bg-ink/5">
                استكشف المنصّة
              </a>
            </div>
          </div>
          <div className="animate-fade-up flex justify-center lg:col-span-2" style={{ animationDelay: "80ms" }}>
            <HeroIllustration />
          </div>
        </section>

        {/* بطاقات الدخول حسب الدور */}
        <section id="roles" className="py-2">
          <h2 className="mb-2 text-center text-sm font-semibold text-ink/70">
            اختر نوع حسابك للدخول
          </h2>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {ROLE_CARDS.map((r, i) => (
              <Link
                key={r.role}
                href={`/login?role=${r.role}`}
                style={{ animationDelay: `${i * 50}ms` }}
                className="card-link animate-fade-up relative flex flex-col items-center overflow-hidden p-2.5 pt-3.5 text-center"
              >
                <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${r.bar}`} />
                <span className={`mb-1.5 flex h-9 w-9 items-center justify-center rounded-xl ${r.accent}`}>
                  {r.icon === "family" ? <FamilyIcon className="h-5 w-5" /> : <Icon name={r.icon} className="h-5 w-5" />}
                </span>
                <h3 className="text-xs font-bold sm:text-sm">{r.title}</h3>
              </Link>
            ))}
          </div>
        </section>

        {/* لماذا إتقان — شريط أيقونات مضغوط بدل بطاقات */}
        <section className="py-2">
          <h2 className="mb-2 text-center text-sm font-semibold text-ink/70">
            لماذا {branding.name}؟
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {FEATURES.map((f) => (
              <span
                key={f.title}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium sm:text-sm"
              >
                <Icon name={f.icon} className="h-4 w-4 text-primary" />
                {f.title}
              </span>
            ))}
          </div>
        </section>

        <DemoCarousel />

        {/* CTA */}
        <section className="py-2">
          <div className="card flex flex-col items-center gap-2 bg-gradient-to-l from-primary to-primary-dark px-5 py-3 text-center text-white sm:flex-row sm:justify-between sm:text-right">
            <div>
              <h2 className="font-display text-base font-bold sm:text-lg">جاهز لتبدأ؟</h2>
              <p className="text-xs text-white/85 sm:text-sm">اجعل الاختبار خطوة نحو الإتقان.</p>
            </div>
            <Link
              href="/login"
              className="shrink-0 rounded-xl bg-white px-5 py-2 text-sm font-bold text-primary-dark transition hover:bg-white/90"
            >
              ابدأ الآن
            </Link>
          </div>
        </section>
      </main>

      {/* Footer — سطر واحد مضغوط */}
      <footer id="about" className="border-t border-line bg-ink/[0.02]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs text-ink/60">
          <div className="flex items-center gap-1.5">
            <BrandLogo size={20} hasLogo={branding.hasLogo} />
            <span className="font-display font-bold">{branding.name}</span>
            {branding.showTagline && branding.tagline && <span className="hidden text-ink/50 sm:inline">· {branding.tagline}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {branding.contactEmail && (
              <a href={`mailto:${branding.contactEmail}`} dir="ltr" className="flex items-center gap-1 hover:text-primary hover:underline">
                <Icon name="mail" className="h-3.5 w-3.5" />
                {branding.contactEmail}
              </a>
            )}
            {branding.contactPhone && (
              <a href={`tel:${branding.contactPhone}`} dir="ltr" className="flex items-center gap-1 hover:text-primary hover:underline">
                <Icon name="phone" className="h-3.5 w-3.5" />
                {branding.contactPhone}
              </a>
            )}
            {branding.about && (
              <button type="button" onClick={() => setShowAbout((v) => !v)} className="flex items-center gap-1 hover:text-primary">
                <Icon name="info" className="h-3.5 w-3.5" />
                عن المنصّة
              </button>
            )}
            <Link href="/login" className="hover:text-primary hover:underline">
              تسجيل الدخول
            </Link>
          </div>
        </div>

        {showAbout && branding.about && (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <div className="mx-auto max-w-2xl rounded-xl border border-line bg-surface p-3 text-center text-xs leading-relaxed text-ink/70 sm:text-sm sm:text-right">
              <p className="whitespace-pre-line">
                <Linkify text={branding.about} />
              </p>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
