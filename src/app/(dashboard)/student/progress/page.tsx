// src/app/(dashboard)/student/progress/page.tsx
// تقدّم الطالب: إتقانه حسب المادة ثم الدرس (الأضعف أوّلاً لإبراز ما يحتاج مراجعة).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import BadgeGrid from "@/components/student/BadgeGrid";
import { getStudentProgress } from "@/lib/studentProgress";
import { computeBadges } from "@/lib/badges";
import { formatDateTime } from "@/lib/datetime";

export const dynamic = "force-dynamic";

// لون شريط الإتقان حسب مستواه.
function masteryClasses(pct: number): { bar: string; text: string; label: string } {
  if (pct >= 80)
    return { bar: "bg-primary", text: "text-primary-dark", label: "متمكّن" };
  if (pct >= 50)
    return { bar: "bg-gold", text: "text-gold", label: "متوسّط" };
  return { bar: "bg-red-500", text: "text-red-600", label: "يحتاج مراجعة" };
}

function MasteryBar({ pct }: { pct: number }) {
  const c = masteryClasses(pct);
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
      <div
        className={`h-full rounded-full ${c.bar}`}
        style={{ width: `${Math.max(pct, 3)}%` }}
      />
    </div>
  );
}

export default async function StudentProgressPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "STUDENT") redirect("/");

  const subjects = await getStudentProgress(session.sub);

  // المحاولات المعتمدة (لا تصحيح معلّق) لاشتقاق شارات عدد الاختبارات والنسب.
  const sessions = await prisma.examSession.findMany({
    where: {
      studentId: session.sub,
      status: { in: ["COMPLETED", "TIMED_OUT"] },
      needsGrading: false,
    },
    select: {
      percentage: true,
      answers: { where: { needsReview: true }, select: { id: true }, take: 1 },
    },
  });
  const finalized = sessions.filter((s) => s.answers.length === 0);
  const pcts = finalized.map((s) => Number(s.percentage));
  const badges = computeBadges({
    finishedCount: finalized.length,
    bestPercentage: pcts.length ? Math.max(...pcts) : null,
    perfectCount: pcts.filter((p) => p >= 100).length,
    subjects,
  });

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/student" className="text-sm text-primary hover:underline">
          ← الرئيسية
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">تقدّمي</h2>
        <p className="mt-1 text-sm text-ink/60">
          إتقانك لكل درس مُشتقٌّ من إجاباتك في الاختبارات المُنهاة. المواد
          والدروس الأضعف تظهر أوّلاً لتعرف ما يحتاج مراجعةً.
        </p>
      </div>

      <BadgeGrid badges={badges} />

      {subjects.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا بيانات بعد — أنهِ اختباراً واحداً على الأقلّ تظهر فيه أسئلةٌ مرتبطة
          بالدروس، ثمّ عُد إلى هنا.
        </div>
      ) : (
        <div className="space-y-5">
          {subjects.map((s) => {
            const c = masteryClasses(s.masteryScore);
            return (
              <div key={s.subjectId} className="card p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold">
                    {s.subjectName}
                  </h3>
                  <span className={`text-sm font-medium ${c.text}`}>
                    {c.label} · {s.masteryScore}% ({s.correctCount}/
                    {s.totalAttempts})
                  </span>
                </div>
                <MasteryBar pct={s.masteryScore} />

                <ul className="mt-4 space-y-3">
                  {s.concepts.map((concept) => {
                    const cc = masteryClasses(concept.masteryScore);
                    return (
                      <li key={concept.conceptId}>
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-medium">
                            {concept.conceptName}
                          </span>
                          <span className={cc.text}>
                            {concept.masteryScore}% ({concept.correctCount}/
                            {concept.totalAttempts})
                            {concept.lastPracticed && (
                              <span className="mr-2 text-xs text-ink/40">
                                آخر ممارسة:{" "}
                                <bdi>{formatDateTime(concept.lastPracticed)}</bdi>
                              </span>
                            )}
                          </span>
                        </div>
                        <MasteryBar pct={concept.masteryScore} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
