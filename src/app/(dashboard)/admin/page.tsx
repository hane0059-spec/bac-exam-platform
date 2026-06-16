// src/app/(dashboard)/admin/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell, { PlaceholderCard } from "@/components/DashboardShell";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <DashboardShell session={session}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/external"
          className="card p-5 transition hover:border-primary/40"
        >
          <h3 className="mb-2 font-display text-lg font-semibold">
            استيراد طلاب خارجيين
          </h3>
          <p className="text-sm leading-relaxed text-ink/60">
            استيراد قائمة طلاب من CSV/Excel وإسناد اختبار منشور لهم.
          </p>
        </Link>
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
