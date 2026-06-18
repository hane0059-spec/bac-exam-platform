// src/app/(dashboard)/admin/users/new/page.tsx
// المدير: إنشاء حساب مدرّس أو مدير.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import UserForm from "@/components/admin/UserForm";
import { getAdminContext } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");

  // مدير المدرسة يرى مواد مؤسّسته فقط (عبر مدرّسيها)؛ المدير العام يرى الكل.
  const subjects = await prisma.subject.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  // اختيار المؤسّسة متاح للمدير العام فقط.
  const schools = ctx.isSuper
    ? await prisma.school.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : undefined;

  // حقول مخصّصة للمدرّسين/المدراء.
  const customFields = await prisma.customFieldDef.findMany({
    where: { isActive: true, appliesTo: { in: ["ALL", "TEACHER", "ADMIN"] } },
    orderBy: { orderNum: "asc" },
    select: {
      id: true,
      label: true,
      fieldKey: true,
      fieldType: true,
      options: true,
      required: true,
    },
  });

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin/users" className="text-sm text-primary hover:underline">
          ← المستخدمون
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">حساب جديد</h2>
      </div>
      <UserForm
        mode="create"
        subjects={subjects}
        canManageAdmins={ctx.isSuper}
        schools={schools}
        customFields={customFields}
      />
    </DashboardShell>
  );
}
