// src/app/(dashboard)/admin/settings/page.tsx
// المدير العام: إعدادات المنصّة (الخطّ).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin";
import { getAppFont, getPlatformMode } from "@/lib/settings";
import DashboardShell from "@/components/DashboardShell";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  if (!ctx.isSuper) redirect("/admin"); // إعدادات المنصّة للمدير العام حصراً

  const [font, platformMode] = await Promise.all([
    getAppFont(),
    getPlatformMode(),
  ]);

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← لوحة المدير
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">الإعدادات</h2>
      </div>
      <SettingsForm currentFont={font} currentMode={platformMode} />
    </DashboardShell>
  );
}
