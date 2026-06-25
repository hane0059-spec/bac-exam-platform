// src/app/(dashboard)/admin/settings/page.tsx
// المدير العام: إعدادات المنصّة (الخطّ).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin";
import { getAppFont, getPlatformMode } from "@/lib/settings";
import { getBranding } from "@/lib/branding";
import DashboardShell from "@/components/DashboardShell";
import SettingsForm from "@/components/admin/SettingsForm";
import BrandingForm from "@/components/admin/BrandingForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  if (!ctx.isSuper) redirect("/admin"); // إعدادات المنصّة للمدير العام حصراً

  const [font, platformMode, branding] = await Promise.all([
    getAppFont(),
    getPlatformMode(),
    getBranding(),
  ]);

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← لوحة المدير
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">الإعدادات</h2>
      </div>
      <div className="space-y-6">
        <BrandingForm current={branding} />
        <SettingsForm currentFont={font} currentMode={platformMode} />
      </div>
    </DashboardShell>
  );
}
