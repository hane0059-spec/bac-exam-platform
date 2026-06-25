// src/app/login/page.tsx
// صفحة الدخول — مكوّن خادم يقرأ هوية المنصّة ويمرّرها لنموذج الدخول.
import { getBranding } from "@/lib/branding";
import { fontCss } from "@/lib/fonts";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const branding = await getBranding();
  // خطّ الاسم يُحلّ على الخادم (لئلّا يُستورَد فهرس الخطوط في حزمة العميل).
  const nameFontCss =
    branding.nameFont === "app" ? "var(--font-app)" : fontCss(branding.nameFont);
  return <LoginForm branding={branding} nameFontCss={nameFontCss} />;
}
