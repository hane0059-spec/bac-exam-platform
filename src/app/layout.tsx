// src/app/layout.tsx
import type { Metadata } from "next";
import { Tajawal, Reem_Kufi } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
});

const reemKufi = Reem_Kufi({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-reem",
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
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${reemKufi.variable}`}>
      <body>{children}</body>
    </html>
  );
}
