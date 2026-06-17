// src/app/(dashboard)/student/quizzes/page.tsx
// قائمة اختبارات الطالب المُسنَدة.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell from "@/components/DashboardShell";
import QuizCountdown from "@/components/student/QuizCountdown";
import JoinByCode from "@/components/student/JoinByCode";
import { listStudentQuizzes, type StudentQuizListItem } from "@/lib/exam";

export const dynamic = "force-dynamic";

function StateBadge({ state }: { state: StudentQuizListItem["state"] }) {
  const map = {
    not_started: { text: "لم يبدأ", cls: "bg-primary-light text-primary-dark" },
    in_progress: { text: "قيد الأداء", cls: "bg-gold/15 text-gold" },
    completed: { text: "مكتمل", cls: "bg-primary text-white" },
    locked: { text: "مُقفل", cls: "bg-ink/10 text-ink/50" },
  } as const;
  const s = map[state];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.text}
    </span>
  );
}

function formatMinutes(sec: number | null): string | null {
  if (!sec) return null;
  const m = Math.round(sec / 60);
  return `${m} دقيقة`;
}

export default async function StudentQuizzesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "STUDENT") redirect("/");

  const quizzes = await listStudentQuizzes(session.sub);

  return (
    <DashboardShell session={session}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">اختباراتي</h2>
        <Link href="/student" className="text-sm text-primary hover:underline">
          ← العودة للوحة
        </Link>
      </div>

      <JoinByCode />

      {quizzes.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا توجد اختبارات مُسنَدة إليك حالياً.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {quizzes.map((q) => {
            const time = formatMinutes(q.timeLimitSec);
            return (
              <div key={q.quizId} className="card flex flex-col p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold leading-snug">
                    {q.title}
                  </h3>
                  <StateBadge state={q.state} />
                </div>
                {q.description && (
                  <p className="mb-3 text-sm leading-relaxed text-ink/60">
                    {q.description}
                  </p>
                )}
                <ul className="mb-4 space-y-1 text-sm text-ink/70">
                  <li>عدد الأسئلة: {q.questionCount}</li>
                  {time && <li>المدة: {time}</li>}
                  <li>
                    المحاولات: {q.attemptsUsed} / {q.maxAttempts}
                  </li>
                  {q.bestPercentage !== null && (
                    <li>أفضل نتيجة: {q.bestPercentage}%</li>
                  )}
                </ul>
                {(q.availableFrom || q.availableUntil) && (
                  <div className="mb-4">
                    <QuizCountdown
                      from={q.availableFrom?.toISOString() ?? null}
                      until={q.availableUntil?.toISOString() ?? null}
                    />
                  </div>
                )}
                <div className="mt-auto">
                  {q.canStart ? (
                    <Link
                      href={`/student/quizzes/${q.quizId}`}
                      className="btn-primary w-full"
                    >
                      {q.state === "in_progress" ? "استئناف" : "ابدأ الاختبار"}
                    </Link>
                  ) : q.state === "completed" ? (
                    <span className="block text-center text-sm text-ink/50">
                      انتهت محاولاتك
                    </span>
                  ) : q.availableFrom || q.availableUntil ? null : (
                    <span className="block text-center text-sm text-ink/50">
                      غير متاح الآن
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
