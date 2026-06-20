// src/app/(dashboard)/teacher/appeals/page.tsx
// اعتراضات الطلاب على نتائج التصحيح اليدوي (المفتوحة أولاً). ملكية المدرّس فقط.
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import AppealRow, { type AppealItem } from "@/components/teacher/AppealRow";

export const dynamic = "force-dynamic";

export default async function TeacherAppealsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const appeals = await prisma.gradeAppeal.findMany({
    where: { session: { quiz: { creatorId: session.sub } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      reason: true,
      status: true,
      teacherResponse: true,
      createdAt: true,
      session: {
        select: {
          id: true,
          quizId: true,
          quiz: { select: { title: true, isFileBased: true } },
        },
      },
      student: { select: { firstName: true, lastName: true } },
    },
  });

  const items: AppealItem[] = appeals.map((a) => ({
    id: a.id,
    studentName: `${a.student.firstName} ${a.student.lastName}`,
    quizTitle: a.session.quiz.title,
    reason: a.reason,
    status: a.status as AppealItem["status"],
    teacherResponse: a.teacherResponse,
    createdAt: a.createdAt.toISOString(),
    // إعادة التصحيح: الورقي من صفحة الإجابات، والعادي من مراجعة الجلسة.
    reviewHref: a.session.quiz.isFileBased
      ? `/teacher/file-exams/${a.session.quizId}/submissions`
      : `/teacher/sessions/${a.session.id}`,
  }));

  const open = items.filter((i) => i.status === "OPEN");
  const resolved = items.filter((i) => i.status !== "OPEN");

  return (
    <DashboardShell session={session}>
      <h2 className="mb-6 font-display text-xl font-bold">اعتراضات التصحيح</h2>

      {items.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا اعتراضات على نتائجك حتى الآن.
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink/50">
              مفتوحة ({open.length})
            </h3>
            {open.length === 0 ? (
              <p className="text-sm text-ink/40">لا اعتراضات مفتوحة.</p>
            ) : (
              open.map((a) => <AppealRow key={a.id} appeal={a} />)
            )}
          </section>

          {resolved.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-ink/50">
                مُعالَجة ({resolved.length})
              </h3>
              {resolved.map((a) => (
                <AppealRow key={a.id} appeal={a} />
              ))}
            </section>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
