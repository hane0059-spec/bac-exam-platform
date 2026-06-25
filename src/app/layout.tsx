// src/app/layout.tsx
import type { Metadata } from "next";
import { Cairo, Tajawal, Reem_Kufi, Amiri, Tinos } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css"; // عرض المعادلات (KaTeX)
import { getAppFont, FONT_CSS } from "@/lib/settings";

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

export const metadata: Metadata = {
  title: "إتقان",
  description: "منصة التقييم والتمكّن",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const font = await getAppFont();
  return (
    <html
      lang="ar"
      dir="rtl"
      className={FONT_VARS}
      style={{ ["--font-app" as string]: FONT_CSS[font] }}
    >
      <body>
        {/* تطبيق حجم النصّ والوضع الليلي المحفوظين قبل أول رسم (تفادي الوميض). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var s=localStorage.getItem('bac-text-scale');if(s){document.documentElement.style.fontSize=(parseFloat(s)*100)+'%';}var t=localStorage.getItem('bac-theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();",
          }}
        />
        {children}
      </body>
    </html>
  );
}
