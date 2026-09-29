// src/app/(dashboard)/student/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell from "@/components/DashboardShell";
import StatBar from "@/components/StatBar";
import { listStudentQuizzes } from "@/lib/exam";
import { enrichmentTeacherIdsForStudent } from "@/lib/enrichment";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "STUDENT") redirect("/");

  // «أسئلة وإثراء»: تظهر البطاقة إن كان له مدرّس مسجَّل عنده وفعّل المدير له الخاصّية.
  const hasEnrichment =
    (await enrichmentTeacherIdsForStudent(session.sub)).length > 0;

  // اختبارات بانتظار الطالب: متاحة للبدء/الاستئناف ولم تكتمل.
  const quizzes = await listStudentQuizzes(session.sub);
  const active = quizzes.filter((q) => !q.archived);
  const pending = active.filter(
    (q) =>
      q.canStart &&
      (q.state === "not_started" || q.state === "in_progress")
  ).length;
  const finished = active.filter((q) => q.hasFinished);
  const scored = finished.filter((q) => q.bestPercentage != null);
  const avg =
    scored.length > 0
      ? Math.round(
          scored.reduce((acc, q) => acc + (q.bestPercentage ?? 0), 0) /
            scored.length
        )
      : null;

  return (
    <DashboardShell session={session}>
      <StatBar
        stats={[
          { label: "اختبارات مُسنَدة", value: active.length, icon: "book" },
          { label: "أنهيتها", value: finished.length, tone: "primary", icon: "check" },
          {
            label: "بانتظارك",
            value: pending,
            tone: pending > 0 ? "gold" : "muted",
            icon: "clock",
          },
          {
            label: "معدّلك",
            value: avg != null ? `${avg}%` : "—",
            tone: avg != null ? "primary" : "muted",
            icon: "chart",
          },
        ]}
      />
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/student/quizzes"
          className="card p-4 transition hover:border-primary/40 sm:p-5"
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
          className="card p-4 transition hover:border-primary/40 sm:p-5"
        >
          <h3 className="mb-2 font-display text-lg font-semibold">تقدّمي</h3>
          <p className="text-sm leading-relaxed text-ink/60">
            نقاط قوّتك وضعفك حسب الدروس، لتعرف ما يحتاج مراجعةً.
          </p>
        </Link>
        <Link
          href="/student/subjects"
          className="card p-4 transition hover:border-primary/40 sm:p-5"
        >
          <h3 className="mb-2 font-display text-lg font-semibold">مواد دراستي</h3>
          <p className="text-sm leading-relaxed text-ink/60">
            المواد المسجَّل فيها ومدرّسوها.
          </p>
        </Link>
        {hasEnrichment && (
          <Link
            href="/student/enrichment"
            className="card p-4 transition hover:border-primary/40 sm:p-5"
          >
            <h3 className="mb-2 font-display text-lg font-semibold">أسئلة وإثراء</h3>
            <p className="text-sm leading-relaxed text-ink/60">
              ملفّات وصور وإعلانات ينشرها لك مدرّسوك.
            </p>
          </Link>
        )}
      </div>
    </DashboardShell>
  );
}
