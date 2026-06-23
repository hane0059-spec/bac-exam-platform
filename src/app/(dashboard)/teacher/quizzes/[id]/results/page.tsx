// src/app/(dashboard)/teacher/quizzes/[id]/results/page.tsx
// تفاصيل نتائج اختبار: جلسات الطلاب ودرجاتهم.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/datetime";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  IN_PROGRESS: "قيد الأداء",
  COMPLETED: "مكتمل",
  TIMED_OUT: "انتهى الوقت",
  ABANDONED: "متروك",
};

export default async function QuizResultsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.creatorId !== session.sub) notFound();

  const sessions = await prisma.examSession.findMany({
    where: { quizId: quiz.id },
    orderBy: { startedAt: "desc" },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          studentProfile: { select: { studentCode: true } },
        },
      },
    },
  });

  // الجلسات التي بها إجابات بانتظار التصحيح.
  const pending = await prisma.studentAnswer.groupBy({
    by: ["sessionId"],
    where: { sessionId: { in: sessions.map((s) => s.id) }, needsReview: true },
    _count: { _all: true },
  });
  const pendingBySession = new Map(pending.map((p) => [p.sessionId, p._count._all]));

  // إحصاءات موجزة للجلسات المكتملة.
  const done = sessions.filter(
    (s) => s.status === "COMPLETED" || s.status === "TIMED_OUT"
  );
  const avgPct =
    done.length > 0
      ? Math.round(
          done.reduce((acc, s) => acc + Number(s.percentage), 0) / done.length
        )
      : null;
  const passCount = done.filter((s) => Number(s.percentage) >= 50).length;

  return (
    <DashboardShell session={session}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/teacher/results"
            className="text-sm text-primary hover:underline"
          >
            ← المتابعة والنتائج
          </Link>
          <h2 className="mt-2 font-display text-xl font-bold">
            نتائج: {quiz.title}
          </h2>
        </div>
        {sessions.length > 0 && (
          <a
            href={`/api/teacher/quizzes/${quiz.id}/results/export`}
            className="rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light"
          >
            تصدير Excel ↓
          </a>
        )}
      </div>

      {done.length > 0 && avgPct !== null && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4 text-center">
            <p className="text-xs text-ink/50">المتأهّلون</p>
            <p className="mt-1 font-display text-2xl font-bold text-primary">
              {done.length}
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-ink/50">المعدّل</p>
            <p
              className={`mt-1 font-display text-2xl font-bold ${
                avgPct >= 50 ? "text-primary-dark" : "text-red-600"
              }`}
            >
              {avgPct}%
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-ink/50">نسبة النجاح ≥50%</p>
            <p className="mt-1 font-display text-2xl font-bold text-gold">
              {done.length > 0
                ? Math.round((passCount / done.length) * 100)
                : 0}
              %
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-ink/50">بانتظار المراجعة</p>
            <p className="mt-1 font-display text-2xl font-bold text-gold">
              {pending.length}
            </p>
          </div>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لم يؤدِّ أحد هذا الاختبار بعد.
        </div>
      ) : (
        <div className="card overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead className="text-ink/50">
              <tr>
                <th className="p-2 text-right">الطالب</th>
                <th className="p-2 text-right">الرمز</th>
                <th className="p-2 text-right">الحالة</th>
                <th className="p-2 text-right">الدرجة</th>
                <th className="p-2 text-right">المحاولة</th>
                <th className="p-2 text-right">التاريخ</th>
                <th className="p-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="p-2">
                    {s.student.firstName} {s.student.lastName}
                  </td>
                  <td className="p-2" dir="ltr">
                    {s.student.studentProfile?.studentCode ?? "—"}
                  </td>
                  <td className="p-2">
                    {STATUS[s.status] ?? s.status}
                    {pendingBySession.get(s.id) ? (
                      <span className="mr-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">
                        بانتظار المراجعة
                      </span>
                    ) : null}
                  </td>
                  <td className="p-2 font-medium">
                    {s.status === "IN_PROGRESS" || s.status === "ABANDONED"
                      ? "—"
                      : `${Number(s.percentage)}% (${s.totalScore}/${s.maxPossibleScore})`}
                  </td>
                  <td className="p-2">{s.attemptNumber}</td>
                  <td className="p-2 text-ink/60">
                    <bdi dir="ltr">{formatDateTime(s.startedAt)}</bdi>
                  </td>
                  <td className="p-2">
                    {s.status !== "IN_PROGRESS" && (
                      <Link
                        href={`/teacher/sessions/${s.id}`}
                        className="text-primary hover:underline"
                      >
                        مراجعة
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
