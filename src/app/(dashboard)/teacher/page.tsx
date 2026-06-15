// src/app/(dashboard)/teacher/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell, { PlaceholderCard } from "@/components/DashboardShell";

export default async function TeacherDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <DashboardShell session={session}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PlaceholderCard
          title="بنك الأسئلة"
          description="إنشاء أسئلتك الخاصة وتصفيتها حسب المادة."
        />
        <PlaceholderCard
          title="تكوين الاختبارات"
          description="بناء الاختبارات من بنك أسئلتك وضبط العلامات والنشر."
        />
        <PlaceholderCard
          title="الإسناد"
          description="إسناد الاختبارات المنشورة لطلابك."
        />
        <PlaceholderCard
          title="طلابي"
          description="إدارة حسابات الطلاب الذين أنشأتهم ومتابعتهم."
        />
        <PlaceholderCard
          title="المتابعة والتصحيح"
          description="مراجعة نتائج الطلاب وتصحيح الأسئلة المقالية."
        />
      </div>
    </DashboardShell>
  );
}
