// src/app/layout.tsx
import type { Metadata } from "next";
import { Cairo, Tajawal, Reem_Kufi } from "next/font/google";
import "./globals.css";
import { getAppFont, type FontKey } from "@/lib/settings";

// خطوط عربية يختار المدير العام بينها؛ كلٌّ يعرّف متغيّره، والمستهلَك «--font-app».
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

const FONT_VAR: Record<FontKey, string> = {
  cairo: "--font-cairo",
  tajawal: "--font-tajawal",
  reem: "--font-reem",
};

export const metadata: Metadata = {
  title: "منصة الاختبارات الإلكترونية",
  description: "منصة اختبارات عربية للطلاب من الابتدائي إلى البكالوريا",
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
      className={`${cairo.variable} ${tajawal.variable} ${reem.variable}`}
      style={{ ["--font-app" as string]: `var(${FONT_VAR[font]})` }}
    >
      <body>
        {/* تطبيق حجم النصّ المحفوظ قبل أول رسم لتفادي وميض التغيير. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var s=localStorage.getItem('bac-text-scale');if(s){document.documentElement.style.fontSize=(parseFloat(s)*100)+'%';}}catch(e){}})();",
          }}
        />
        {children}
      </body>
    </html>
  );
}
