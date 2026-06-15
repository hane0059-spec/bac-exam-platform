// src/app/(dashboard)/admin/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell, { PlaceholderCard } from "@/components/DashboardShell";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <DashboardShell session={session}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PlaceholderCard
          title="المستخدمون"
          description="إنشاء وإدارة حسابات المدراء والمدرّسين والطلاب."
        />
        <PlaceholderCard
          title="المواد والصفوف"
          description="إدارة الصفوف الدراسية والمواد وربط المدرّسين بها."
        />
        <PlaceholderCard
          title="البنك العام للأسئلة"
          description="الإشراف على بنك الأسئلة المشترك بين المدرّسين."
        />
        <PlaceholderCard
          title="الإعدادات"
          description="ضبط الخط والثيم وإعدادات المنصة العامة."
        />
      </div>
    </DashboardShell>
  );
}
