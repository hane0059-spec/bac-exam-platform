// src/app/(dashboard)/admin/parents/new/page.tsx
// المدير: إنشاء ولي أمر جديد وربطه بطلاب.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import ParentForm from "@/components/admin/ParentForm";

export const dynamic = "force-dynamic";

export default async function NewParentPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");

  // اختيار المؤسّسة متاح للمدير العام فقط.
  const schools = ctx.isSuper
    ? await prisma.school.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : undefined;

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin/parents" className="text-sm text-primary hover:underline">
          ← أولياء الأمور
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">ولي أمر جديد</h2>
        <p className="mt-1 text-sm text-ink/60">
          اربطه بأبنائه بلصق رموز الطلاب (من مؤسّستك).
        </p>
      </div>
      <ParentForm schools={schools} />
    </DashboardShell>
  );
}
