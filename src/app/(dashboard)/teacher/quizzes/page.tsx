// src/app/(dashboard)/teacher/quizzes/page.tsx
// قائمة اختبارات المدرّس.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

const STATUS = {
  DRAFT: { text: "مسوّدة", cls: "bg-ink/10 text-ink/60" },
  PUBLISHED: { text: "منشور", cls: "bg-primary text-white" },
  ARCHIVED: { text: "مؤرشف", cls: "bg-gold/15 text-gold" },
} as const;

export default async function TeacherQuizzesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const quizzes = await prisma.quiz.findMany({
    where: { creatorId: session.sub },
    orderBy: { updatedAt: "desc" },
    include: {
      subject: { select: { name: true } },
      _count: { select: { nodes: true, sessions: true, assignments: true } },
    },
  });
  // وجهة كل اختبار حسب نوعه (شجري ← المحرّر، ورقي ← الإدارة).
  const hrefOf = (q: { id: string; isFileBased: boolean }) =>
    q.isFileBased
      ? `/teacher/file-exams/${q.id}`
      : `/teacher/quizzes/${q.id}/edit`;

  return (
    <DashboardShell session={session}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">اختباراتي</h2>
        <div className="flex gap-2">
          <Link
            href="/teacher/file-exams/new"
            className="rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light"
          >
            + اختبار ورقي
          </Link>
          <Link href="/teacher/quizzes/new" className="btn-primary">
            + اختبار جديد
          </Link>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا توجد اختبارات بعد. أنشئ اختبارك الأول من بنك أسئلتك.
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((q) => {
            const st = STATUS[q.status as keyof typeof STATUS];
            // عُقد الأسئلة = إجمالي العُقد - (بداية + نهاية) عند وجودها.
            const questionNodes = Math.max(0, q._count.nodes - 2);
            return (
              <Link
                key={q.id}
                href={hrefOf(q)}
                className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-primary/40"
              >
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}
                    >
                      {st.text}
                    </span>
                    {q.isFileBased && (
                      <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">
                        ورقي
                      </span>
                    )}
                    <h3 className="font-display text-lg font-semibold">
                      {q.title}
                    </h3>
                  </div>
                  <p className="text-sm text-ink/60">
                    {q.subject.name}
                    {!q.isFileBased && ` • ${questionNodes} سؤال`}
                    {q._count.assignments > 0 &&
                      ` • مُسنَد لـ ${q._count.assignments}`}
                    {q._count.sessions > 0 &&
                      ` • ${q._count.sessions} محاولة`}
                  </p>
                </div>
                <span className="text-sm text-primary">
                  {q.isFileBased ? "إدارة ←" : "تحرير ←"}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
