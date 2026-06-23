// src/app/(dashboard)/student/quizzes/page.tsx
// قائمة اختبارات الطالب المُسنَدة.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell from "@/components/DashboardShell";
import QuizCountdown from "@/components/student/QuizCountdown";
import JoinByCode from "@/components/student/JoinByCode";
import StudentArchiveToggle from "@/components/student/StudentArchiveToggle";
import { listStudentQuizzes, type StudentQuizListItem } from "@/lib/exam";
import { CERTIFICATE_THRESHOLD } from "@/lib/certificate";

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

const ENDING_SOON_HOURS = 48;

// «ينتهي قريباً»: اختبار يمكن بدؤه وتنتهي إتاحته خلال 48 ساعة.
function endingSoon(q: StudentQuizListItem): boolean {
  if (!q.canStart || !q.availableUntil) return false;
  const diff = q.availableUntil.getTime() - Date.now();
  return diff > 0 && diff <= ENDING_SOON_HOURS * 3600 * 1000;
}

// أولوية العرض: العاجل ثمّ القابل للاستئناف ثمّ المتاح ثمّ المكتمل ثمّ المُقفل.
function priority(q: StudentQuizListItem): number {
  if (endingSoon(q)) return 0;
  if (q.canStart && q.state === "in_progress") return 1;
  if (q.canStart) return 2;
  if (q.state === "completed") return 3;
  return 4;
}

export default async function StudentQuizzesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "STUDENT") redirect("/");

  const tab = searchParams.tab === "archive" ? "archive" : "active";
  const all = await listStudentQuizzes(session.sub);
  const activeList = all.filter((q) => !q.archived);
  const archiveList = all.filter((q) => q.archived);
  // العاجل والقابل للأداء أوّلاً ليراه الطالب فوراً.
  const quizzes = [...(tab === "archive" ? archiveList : activeList)].sort(
    (a, b) => priority(a) - priority(b)
  );

  const pill = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm transition ${
      active ? "bg-primary text-white" : "bg-ink/5 text-ink/70 hover:bg-primary-light"
    }`;

  return (
    <DashboardShell session={session}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">اختباراتي</h2>
        <Link href="/student" className="text-sm text-primary hover:underline">
          ← العودة للوحة
        </Link>
      </div>

      {tab === "active" && <JoinByCode />}

      <div className="mb-5 flex gap-2">
        <Link href="/student/quizzes?tab=active" className={pill(tab === "active")}>
          النشطة ({activeList.length})
        </Link>
        <Link href="/student/quizzes?tab=archive" className={pill(tab === "archive")}>
          الأرشيف ({archiveList.length})
        </Link>
      </div>

      {quizzes.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          {tab === "archive"
            ? "لا اختبارات في أرشيفك. انقل اختباراتك المنتهية إلى الأرشيف بعد الاطّلاع على نتيجتها."
            : "لا توجد اختبارات مُسنَدة إليك حالياً."}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {quizzes.map((q) => {
            const time = formatMinutes(q.timeLimitSec);
            const soon = endingSoon(q);
            const availableNow = q.canStart && q.state === "not_started";
            return (
              <div
                key={q.quizId}
                className={`card flex flex-col p-5 ${
                  soon ? "border-red-300 ring-1 ring-red-200" : ""
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold leading-snug">
                    {q.title}
                    {q.isFileBased && (
                      <span className="mr-2 rounded-full bg-gold/15 px-2 py-0.5 align-middle text-xs font-medium text-gold">
                        ورقي
                      </span>
                    )}
                  </h3>
                  <StateBadge state={q.state} />
                </div>
                {(soon || availableNow) && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {availableNow && (
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
                        متاح الآن
                      </span>
                    )}
                    {soon && (
                      <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
                        ⏰ ينتهي قريباً
                      </span>
                    )}
                  </div>
                )}
                {q.description && (
                  <p className="mb-3 text-sm leading-relaxed text-ink/60">
                    {q.description}
                  </p>
                )}
                <ul className="mb-4 space-y-1 text-sm text-ink/70">
                  {q.isFileBased ? (
                    <li>رفع صورة الإجابة وتصحيح المدرّس</li>
                  ) : (
                    <li>عدد الأسئلة: {q.questionCount}</li>
                  )}
                  {time && <li>المدة: {time}</li>}
                  <li>
                    المحاولات: {q.attemptsUsed} / {q.maxAttempts}
                  </li>
                  {!q.isFileBased && q.bestPercentage !== null && (
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
                <div className="mt-auto space-y-2">
                  {q.canStart && (
                    <Link
                      href={`/student/quizzes/${q.quizId}`}
                      className="btn-primary block w-full text-center"
                    >
                      {q.state === "in_progress"
                        ? "استئناف"
                        : q.hasFinished
                        ? "محاولة جديدة"
                        : "ابدأ الاختبار"}
                    </Link>
                  )}
                  {/* الورقي: نتيجته قابلة لإعادة العرض دائماً. */}
                  {q.isFileBased && q.hasFinished && (
                    <Link
                      href={`/student/quizzes/${q.quizId}`}
                      className="block text-center text-sm text-primary hover:underline"
                    >
                      عرض النتيجة
                    </Link>
                  )}
                  {!q.canStart && !q.hasFinished && (
                    <span className="block text-center text-sm text-ink/50">
                      {q.availableFrom && q.availableFrom.getTime() > Date.now()
                        ? "يبدأ لاحقاً"
                        : q.availableUntil &&
                          q.availableUntil.getTime() < Date.now()
                        ? "انتهت إتاحته"
                        : "غير متاح الآن"}
                    </span>
                  )}
                  {q.hasFinished &&
                    q.bestPercentage != null &&
                    q.bestPercentage >= CERTIFICATE_THRESHOLD && (
                      <a
                        href={`/student/certificate/${q.quizId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl border border-gold px-4 py-2 text-center text-sm font-medium text-gold hover:bg-gold/10"
                      >
                        🏅 شهادة تقدير
                      </a>
                    )}
                  {q.hasFinished && (
                    <StudentArchiveToggle
                      quizId={q.quizId}
                      archived={q.archived}
                      className="w-full rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
                    />
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
