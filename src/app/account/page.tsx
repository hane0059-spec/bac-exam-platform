// src/app/account/page.tsx
// صفحة الحساب — متاحة لكل الأدوار: تغيير كلمة السر ذاتياً.
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { roleLabel } from "@/lib/gender";
import DashboardShell from "@/components/DashboardShell";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import RequestAccountDeletion from "@/components/teacher/RequestAccountDeletion";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <h2 className="font-display text-xl font-bold">حسابي</h2>
        <p className="mt-1 text-sm text-ink/60">
          {session.firstName} {session.lastName} •{" "}
          {roleLabel(session.role, session.gender)}
        </p>
      </div>
      <div className="space-y-5">
        <ChangePasswordForm />
        {session.role === "TEACHER" && <RequestAccountDeletion />}
      </div>
    </DashboardShell>
  );
}
