// src/app/page.tsx
// الجذر: المسجَّل دخوله يُحوَّل للوحته؛ وغير المسجَّل يرى الصفحة الرئيسية العامّة
// (تسويقية بحتة — بلا بيانات مستخدمين أو اختبارات حقيقية، تحويلها لـ/login للدخول).
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { dashboardPath } from "@/lib/auth";
import { getBranding } from "@/lib/branding";
import { fontCss } from "@/lib/fonts";
import LandingPage from "@/components/LandingPage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect(dashboardPath(session.role));

  const branding = await getBranding();
  const nameFontCss =
    branding.nameFont === "app" ? "var(--font-app)" : fontCss(branding.nameFont);
  return <LandingPage branding={branding} nameFontCss={nameFontCss} />;
}
