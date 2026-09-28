// src/app/(dashboard)/teacher/results/page.tsx
// متابعة المدرّس: اختباراته مع إحصاءات الأداء.
import { sweepExpiredSessions } from "@/lib/exam";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

export default async function TeacherResultsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  await sweepExpiredSessions({ quiz: { creatorId: session.sub } });
  const quizzes = await prisma.quiz.findMany({
    where: { creatorId: session.sub },
    orderBy: { updatedAt: "desc" },
    include: {
      subject: { select: { name: true } },
      sessions: { select: { id: true, status: true, percentage: true, needsGrading: true } },
    },
  });

  // جلسات فيها إجابة بانتظار مراجعة يدويّة (قصيرة/مقالي/فراغات) — لتحديد أيّ
  // اختبار يحتاج تصحيحك الآن، إذ القائمة وحدها لا تكشف ذلك دون فتح كل اختبار.
  const pending = await prisma.studentAnswer.groupBy({
    by: ["sessionId"],
    where: { needsReview: true, session: { quiz: { creatorId: session.sub } } },
  });
  const pendingSessionIds = new Set(pending.map((p) => p.sessionId));

  const rows = quizzes.map((q) => {
    const finished = q.sessions.filter(
      (s) => s.status === "COMPLETED" || s.status === "TIMED_OUT"
    );
    const inProgress = q.sessions.filter(
      (s) => s.status === "IN_PROGRESS"
    ).length;
    const needsReview = q.sessions.filter(
      (s) => s.needsGrading || pendingSessionIds.has(s.id)
    ).length;
    const avg =
      finished.length > 0
        ? Math.round(
            finished.reduce((sum, s) => sum + Number(s.percentage), 0) /
              finished.length
          )
        : null;
    return {
      id: q.id,
      title: q.title,
      subjectName: q.subject.name,
      finished: finished.length,
      inProgress,
      needsReview,
      avg,
    };
  });
  // الاختبارات التي تحتاج تصحيحاً تظهر أوّلاً.
  rows.sort((a, b) => Number(b.needsReview > 0) - Number(a.needsReview > 0));

  return (
    <DashboardShell session={session}>
      <h2 className="mb-6 font-display text-xl font-bold">المتابعة والنتائج</h2>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا توجد اختبارات بعد.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/teacher/quizzes/${r.id}/results`}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-primary/40"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{r.title}</h3>
                  {r.needsReview > 0 && (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
                      ⏳ بانتظار تصحيحك ({r.needsReview})
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink/60">
                  {r.subjectName} · أدّى {r.finished}
                  {r.inProgress > 0 && ` · قيد الأداء ${r.inProgress}`}
                  {r.avg !== null && ` · المتوسّط ${r.avg}%`}
                </p>
              </div>
              <span className="text-sm text-primary">التفاصيل ←</span>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
