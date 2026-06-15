// src/app/layout.tsx
import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

// Cairo — خطّ عربي رسمي واضح، يُستخدم للنصّ والعناوين معاً.
// متغيّر CSS واحد ليسهُل تبديله لاحقاً من إعدادات الموقع (لوحة المدير).
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "منصة الاختبارات الإلكترونية",
  description: "منصة اختبارات عربية للطلاب من الابتدائي إلى البكالوريا",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
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
