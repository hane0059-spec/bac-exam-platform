// src/app/login/page.tsx
// صفحة الدخول — مكوّن خادم يقرأ هوية المنصّة ويمرّرها لنموذج الدخول.
import { getBranding } from "@/lib/branding";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const branding = await getBranding();
  return <LoginForm branding={branding} />;
}
