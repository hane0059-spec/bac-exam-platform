// src/app/(dashboard)/student/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell from "@/components/DashboardShell";
import { listStudentQuizzes } from "@/lib/exam";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "STUDENT") redirect("/");

  // اختبارات بانتظار الطالب: متاحة للبدء/الاستئناف ولم تكتمل.
  const quizzes = await listStudentQuizzes(session.sub);
  const pending = quizzes.filter(
    (q) =>
      !q.archived &&
      q.canStart &&
      (q.state === "not_started" || q.state === "in_progress")
  ).length;

  return (
    <DashboardShell session={session}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/student/quizzes"
          className="card p-5 transition hover:border-primary/40"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">اختباراتي</h3>
            {pending > 0 && (
              <span className="flex h-6 items-center justify-center gap-1 rounded-full bg-primary px-2 text-xs font-bold text-white">
                {pending} بانتظارك
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-ink/60">
            عرض الاختبارات المُسنَدة إليك والبدء بأدائها.
          </p>
        </Link>
        <Link
          href="/student/progress"
          className="card p-5 transition hover:border-primary/40"
        >
          <h3 className="mb-2 font-display text-lg font-semibold">تقدّمي</h3>
          <p className="text-sm leading-relaxed text-ink/60">
            نقاط قوّتك وضعفك حسب الدروس، لتعرف ما يحتاج مراجعةً.
          </p>
        </Link>
        <Link
          href="/student/subjects"
          className="card p-5 transition hover:border-primary/40"
        >
          <h3 className="mb-2 font-display text-lg font-semibold">مواد دراستي</h3>
          <p className="text-sm leading-relaxed text-ink/60">
            المواد المسجَّل فيها ومدرّسوها.
          </p>
        </Link>
      </div>
    </DashboardShell>
  );
}
