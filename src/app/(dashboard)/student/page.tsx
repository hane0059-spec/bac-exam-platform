// src/app/(dashboard)/student/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell, { PlaceholderCard } from "@/components/DashboardShell";

export default async function StudentDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <DashboardShell session={session}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/student/quizzes" className="card p-5 transition hover:border-primary/40">
          <h3 className="mb-2 font-display text-lg font-semibold">اختباراتي</h3>
          <p className="text-sm leading-relaxed text-ink/60">
            عرض الاختبارات المُسنَدة إليك والبدء بأدائها.
          </p>
        </Link>
        <Link href="/student/progress" className="card p-5 transition hover:border-primary/40">
          <h3 className="mb-2 font-display text-lg font-semibold">تقدّمي</h3>
          <p className="text-sm leading-relaxed text-ink/60">
            نقاط قوّتك وضعفك حسب الدروس، لتعرف ما يحتاج مراجعةً.
          </p>
        </Link>
        <PlaceholderCard
          title="مواد دراستي"
          description="المواد المسجَّل فيها ومدرّسوها."
        />
      </div>
    </DashboardShell>
  );
}
