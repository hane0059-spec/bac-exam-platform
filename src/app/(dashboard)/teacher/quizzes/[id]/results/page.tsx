// src/app/(dashboard)/teacher/quizzes/[id]/results/page.tsx
// تفاصيل نتائج اختبار: جلسات الطلاب ودرجاتهم.
import { agoArabic } from "@/lib/relativeTime";
import EndSessionButton from "@/components/teacher/EndSessionButton";
import { isStaleSession } from "@/lib/staleSession";
import { parseSettings } from "@/lib/exam";
import { eligibleForTeacherCertificate } from "@/lib/certificate";
import { sweepExpiredSessions } from "@/lib/exam";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import LocalTime from "@/components/LocalTime";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  IN_PROGRESS: "قيد الأداء",
  COMPLETED: "مكتمل",
  TIMED_OUT: "انتهى الوقت",
  ABANDONED: "متروك",
};

export default async function QuizResultsPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.creatorId !== session.sub) notFound();

  await sweepExpiredSessions({ quizId: quiz.id });
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
    where: {
      sessionId: { in: sessions.map((s) => s.id) },
      needsReview: true,
      // المنتهية فقط: الجلسة قيد الأداء لا تُراجَع قبل أن يسلّمها الطالب.
      session: { status: { in: ["COMPLETED", "TIMED_OUT"] } },
    },
    _count: { _all: true },
  });
  const pendingBySession = new Map(pending.map((p) => [p.sessionId, p._count._all]));

  // الجلسات «قيد الأداء» العالقة (بعد الموعد النهائي بساعة) ← زرّ إنهاء يدوي للمدرّس.
  const openIds = sessions.filter((s) => s.status === "IN_PROGRESS").map((s) => s.id);
  const lastAnswers = openIds.length
    ? await prisma.studentAnswer.groupBy({
        by: ["sessionId"],
        where: { sessionId: { in: openIds } },
        _max: { answeredAt: true },
        _count: { _all: true },
      })
    : [];
  const lastActivity = new Map(lastAnswers.map((a) => [a.sessionId, a._max.answeredAt]));
  const answeredCount = new Map(lastAnswers.map((a) => [a.sessionId, a._count._all]));
  const totalQuestions = await prisma.quizNode.count({ where: { quizId: quiz.id, nodeType: "QUESTION" } });
  const nowMs = Date.now();
  const quizLimit = parseSettings(quiz.settings).timeLimitSec;
  const staleIds = new Set(
    sessions
      .filter(
        (s) =>
          s.status === "IN_PROGRESS" &&
          !quiz.isFileBased &&
          isStaleSession({
            startedAt: s.startedAt,
            lastActivity: lastActivity.get(s.id) ?? null,
            timeLimitSec: quizLimit,
            availableUntil: quiz.availableUntil,
          })
      )
      .map((s) => s.id)
  );

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
            className="text-base font-semibold text-red-800 hover:text-red-900 hover:underline"
          >
            ← المتابعة والنتائج
          </Link>
          <h2 className="mt-2 font-display text-xl font-bold">
            نتائج: {quiz.title}
          </h2>
        </div>
        {sessions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {done.length > 0 && (
              <Link
                href={`/teacher/quizzes/${quiz.id}/certificates`}
                className="rounded-xl border border-gold px-4 py-2 text-sm font-medium text-gold hover:bg-gold/10"
              >
                🏅 شهادات الطلاب (PDF)
              </Link>
            )}
            <a
              href={`/api/teacher/quizzes/${quiz.id}/results/export`}
              className="rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light"
            >
              تصدير Excel ↓
            </a>
          </div>
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
                    {s.status === "IN_PROGRESS" && (
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink/55">
                        بدأ {agoArabic(nowMs - s.startedAt.getTime())}
                        {" · "}
                        {lastActivity.get(s.id)
                          ? `آخر إجابة ${agoArabic(nowMs - lastActivity.get(s.id)!.getTime())}`
                          : "لم يُجب عن شيء بعد"}
                        {totalQuestions > 0 && (answeredCount.get(s.id) ?? 0) > 0 && (
                          <> · أجاب {answeredCount.get(s.id)} من {totalQuestions}</>
                        )}
                        {staleIds.has(s.id) && (
                          <span className="mr-1 font-medium text-red-800"> — يبدو منقطعاً</span>
                        )}
                      </span>
                    )}
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
                    <bdi dir="ltr"><LocalTime value={s.startedAt} /></bdi>
                  </td>
                  <td className="p-2">
                    {staleIds.has(s.id) && (
                      <EndSessionButton
                        sessionId={s.id}
                        studentName={`${s.student.firstName} ${s.student.lastName}`}
                      />
                    )}
                    {s.status !== "IN_PROGRESS" && (
                      <span className="flex items-center gap-2">
                        <Link
                          href={`/teacher/sessions/${s.id}`}
                          className="text-primary hover:underline"
                        >
                          مراجعة
                        </Link>
                        {eligibleForTeacherCertificate({
                          status: s.status,
                          percentage: Number(s.percentage),
                          needsGrading: s.needsGrading,
                          pendingReview: Boolean(pendingBySession.get(s.id)),
                        }) && (
                          <Link
                            href={`/teacher/certificates/${s.id}`}
                            className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold hover:bg-gold/25"
                          >
                            🏅 شهادة تقدير
                          </Link>
                        )}
                        {pendingBySession.get(s.id) ? (
                          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">
                            ⏳ بانتظار التصحيح
                          </span>
                        ) : (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">
                            ✓ تمّ التصحيح
                          </span>
                        )}
                      </span>
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
