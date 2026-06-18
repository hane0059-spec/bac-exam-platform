// src/app/(dashboard)/admin/users/new/page.tsx
// المدير: إنشاء حساب مدرّس أو مدير.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import UserForm from "@/components/admin/UserForm";
import { isSuperAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const [subjects, canManageAdmins] = await Promise.all([
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    isSuperAdmin(session.sub),
  ]);

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/admin/users" className="text-sm text-primary hover:underline">
          ← المستخدمون
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">حساب جديد</h2>
      </div>
      <UserForm
        mode="create"
        subjects={subjects}
        canManageAdmins={canManageAdmins}
      />
    </DashboardShell>
  );
}
