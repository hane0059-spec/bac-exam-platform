// src/app/(dashboard)/parent/students/[studentId]/page.tsx
// لوحة ولي الأمر: نتائج ابن واحد (قراءة فقط) — مع فحص ملكية صارم.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getParentSession, parentOwnsStudent } from "@/lib/parent";
import { formatDateTime } from "@/lib/datetime";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

export default async function ChildResultsPage({
  params,
}: {
  params: { studentId: string };
}) {
  const session = await getParentSession();
  if (!session) redirect("/login");

  // فحص ملكية: لا يرى وليّ الأمر إلا أبناءه (خصوصية القُصّر).
  if (!(await parentOwnsStudent(session.sub, params.studentId))) notFound();

  const student = await prisma.user.findUnique({
    where: { id: params.studentId },
    select: {
      firstName: true,
      lastName: true,
      studentProfile: {
        select: { gradeLevel: { select: { name: true } } },
      },
    },
  });
  if (!student) notFound();

  const sessions = await prisma.examSession.findMany({
    where: {
      studentId: params.studentId,
      status: { in: ["COMPLETED", "TIMED_OUT"] },
    },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      status: true,
      percentage: true,
      completedAt: true,
      needsGrading: true,
      quiz: { select: { title: true } },
      _count: { select: { answers: { where: { needsReview: true } } } },
    },
  });

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/parent" className="text-sm text-primary hover:underline">
          ← أبنائي
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">
          نتائج: {student.firstName} {student.lastName}
        </h2>
        {student.studentProfile?.gradeLevel && (
          <p className="mt-1 text-sm text-ink/60">
            {student.studentProfile.gradeLevel.name}
          </p>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا نتائج مكتملة بعد.
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const pending = s._count.answers > 0 || s.needsGrading;
            return (
              <Link
                key={s.id}
                href={`/parent/students/${params.studentId}/sessions/${s.id}`}
                className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-primary/40"
              >
                <div>
                  <span className="font-medium">{s.quiz.title}</span>
                  {s.completedAt && (
                    <p className="mt-0.5 text-xs text-ink/40">
                      <bdi dir="ltr">{formatDateTime(s.completedAt)}</bdi>
                    </p>
                  )}
                </div>
                {pending ? (
                  <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs text-gold">
                    بانتظار التصحيح
                  </span>
                ) : (
                  <span className="font-display text-lg font-bold text-primary">
                    {Number(s.percentage)}%
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
