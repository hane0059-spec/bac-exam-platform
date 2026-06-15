// src/app/(dashboard)/student/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell, { PlaceholderCard } from "@/components/DashboardShell";

export default async function StudentDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <DashboardShell session={session}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PlaceholderCard
          title="اختباراتي"
          description="عرض الاختبارات المُسنَدة إليك والبدء بأدائها."
        />
        <PlaceholderCard
          title="نتائجي"
          description="مراجعة درجاتك وإجاباتك بعد التصحيح الفوري."
        />
        <PlaceholderCard
          title="مواد دراستي"
          description="المواد المسجَّل فيها ومدرّسوها."
        />
      </div>
    </DashboardShell>
  );
}
