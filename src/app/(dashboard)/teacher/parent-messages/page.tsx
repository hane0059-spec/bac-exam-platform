// src/app/(dashboard)/teacher/parent-messages/page.tsx
// رسائل أولياء الأمور (اعتراض/شكر/طلب إعادة) على اختبارات المدرّس فقط.
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import ParentMessageRow, {
  type ParentMessageItem,
} from "@/components/teacher/ParentMessageRow";

export const dynamic = "force-dynamic";

export default async function TeacherParentMessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const rows = await prisma.parentMessage.findMany({
    where: { session: { quiz: { creatorId: session.sub } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      kind: true,
      body: true,
      status: true,
      teacherResponse: true,
      createdAt: true,
      sessionId: true,
      parent: { select: { firstName: true, lastName: true } },
      student: { select: { firstName: true, lastName: true } },
      session: {
        select: { quizId: true, quiz: { select: { title: true, isFileBased: true } } },
      },
    },
  });

  const items: ParentMessageItem[] = rows.map((m) => ({
    id: m.id,
    kind: m.kind,
    body: m.body,
    status: m.status,
    teacherResponse: m.teacherResponse,
    createdAt: m.createdAt.toISOString(),
    parentName: `${m.parent.firstName} ${m.parent.lastName}`,
    studentName: `${m.student.firstName} ${m.student.lastName}`,
    quizTitle: m.session.quiz.title,
    sessionHref: m.session.quiz.isFileBased
      ? `/teacher/file-exams/${m.session.quizId}/submissions`
      : `/teacher/sessions/${m.sessionId}`,
    assignHref: m.session.quiz.isFileBased
      ? `/teacher/file-exams/${m.session.quizId}`
      : `/teacher/quizzes/${m.session.quizId}/assign`,
  }));
  const open = items.filter((i) => i.status === "OPEN");
  const done = items.filter((i) => i.status === "ANSWERED");

  return (
    <DashboardShell session={session}>
      <h2 className="mb-6 font-display text-xl font-bold">رسائل أولياء الأمور</h2>
      {items.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">لا رسائل حتى الآن.</div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-ink/50">بانتظار الردّ ({open.length})</h3>
            {open.length === 0 ? (
              <p className="text-sm text-ink/40">لا رسائل بانتظار الردّ.</p>
            ) : (
              open.map((m) => <ParentMessageRow key={m.id} item={m} />)
            )}
          </section>
          {done.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-ink/50">تمّ الردّ ({done.length})</h3>
              {done.map((m) => (
                <ParentMessageRow key={m.id} item={m} />
              ))}
            </section>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
