// src/app/(dashboard)/admin/fields/page.tsx
// المدير العام: إدارة الحقول المخصّصة للمستخدمين.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import FieldsManager from "@/components/admin/FieldsManager";
import { isSoloMode } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminFieldsPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  if (!ctx.isSuper) redirect("/admin");
  if (await isSoloMode()) redirect("/admin"); // غير متاح في الوضع المبسّط

  const fields = await prisma.customFieldDef.findMany({
    orderBy: { orderNum: "asc" },
    select: {
      id: true,
      label: true,
      fieldType: true,
      required: true,
      appliesTo: true,
      options: true,
    },
  });

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← لوحة المدير
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">الحقول المخصّصة</h2>
        <p className="mt-1 text-sm text-ink/60">
          عرّف حقولاً إضافية لبيانات المستخدمين (مدينة/مدرسة…) وحدّد إجباريتها
          وجمهورها؛ تظهر في نماذج الإنشاء تلقائياً.
        </p>
      </div>
      <FieldsManager fields={fields} />
    </DashboardShell>
  );
}
