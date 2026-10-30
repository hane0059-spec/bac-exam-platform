// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Cairo, Tajawal, Reem_Kufi, Amiri, Tinos } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css"; // عرض المعادلات (KaTeX)
import { getAppFont, FONT_CSS, getAppBgColor, bgColorToRgb } from "@/lib/settings";
import { getBranding } from "@/lib/branding";
import PwaRegister from "@/components/PwaRegister";
import A11yLabels from "@/components/A11yLabels";

// خطوط يختار المدير العام بينها؛ كلٌّ يعرّف متغيّره، والمستهلَك «--font-app».
// Amiri/Tinos بدائل ويب للخطوط النظامية (التقليدي/تايمز) لتظهر على كل الأجهزة.
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cairo",
  display: "swap",
});
const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
});
const reem = Reem_Kufi({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-reem",
  display: "swap",
});
const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});
const tinos = Tinos({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-tinos",
  display: "swap",
});

const FONT_VARS = `${cairo.variable} ${tajawal.variable} ${reem.variable} ${amiri.variable} ${tinos.variable}`;

export const viewport: Viewport = { themeColor: "#FFFFFF" };

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: branding.name,
    description: branding.tagline || "منصة التقييم والتمكّن",
    // PWA: أيقونة الشاشة الرئيسية للآيفون + وضع التطبيق المستقلّ.
    icons: {
      icon: [{ url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: "/brand/icon-180.png",
    },
    appleWebApp: { capable: true, title: branding.name },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [font, bgColor] = await Promise.all([getAppFont(), getAppBgColor()]);
  return (
    <html
      lang="ar"
      dir="rtl"
      // السكربت المضمَّن قبل الرسم يضيف صنف الوضع الليلي وحجم النصّ للمتصفّح فقط: تفاوت متوقَّع لا خلل.
      suppressHydrationWarning
      className={FONT_VARS}
      style={{ ["--font-app" as string]: FONT_CSS[font] }}
    >
      <head>
        {/* لون خلفية المنصّة (--parchment) — الوضع النهاري فقط (@media screen)
            وخارج .dark، فلا يمسّ الوضع الليلي ولا الطباعة (تُجبَر بيضاء دائماً).
            بلا تخصيص (bgColor=null) لا نحقن شيئاً فيبقى اللون المحايد الافتراضي. */}
        {bgColor && (
          <style
            dangerouslySetInnerHTML={{
              __html: `@media screen { :root:not(.dark) { --parchment: ${bgColorToRgb(bgColor)}; } }`,
            }}
          />
        )}
      </head>
      <body>
        {/* تطبيق حجم النصّ والوضع الليلي المحفوظين قبل أول رسم (تفادي الوميض). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var s=localStorage.getItem('bac-text-scale');if(s){document.documentElement.style.fontSize=(parseFloat(s)*100)+'%';}var t=localStorage.getItem('bac-theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();",
          }}
        />
        <PwaRegister />
        <A11yLabels />
        {children}
      </body>
    </html>
  );
}
