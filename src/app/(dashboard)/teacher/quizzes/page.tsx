// src/app/(dashboard)/teacher/quizzes/page.tsx
// قائمة اختبارات المدرّس بتبويبين: النشطة، والأرشيف (المكتملة تلقائياً + المؤرشفة).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { teacherCanFileExams } from "@/lib/teacher";
import { computeDoneQuizIds } from "@/lib/teacherArchive";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

const STATUS = {
  DRAFT: { text: "مسوّدة", cls: "bg-ink/10 text-ink/60" },
  PUBLISHED: { text: "منشور", cls: "bg-primary text-white" },
  ARCHIVED: { text: "مؤرشف", cls: "bg-gold/15 text-gold" },
} as const;

type Tab = "active" | "archive";

export default async function TeacherQuizzesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const tab: Tab = searchParams.tab === "archive" ? "archive" : "active";

  const [quizzes, canFileExams] = await Promise.all([
    prisma.quiz.findMany({
      where: { creatorId: session.sub },
      orderBy: { updatedAt: "desc" },
      include: {
        subject: { select: { name: true } },
        _count: { select: { nodes: true, sessions: true, assignments: true } },
      },
    }),
    teacherCanFileExams(session.sub),
  ]);

  // «مكتمل» = صُحِّح لكل المُسنَد إليهم (مُشتقّ). يُحسَب للمنشور فقط.
  const publishedIds = quizzes
    .filter((q) => q.status === "PUBLISHED")
    .map((q) => q.id);
  const doneIds = await computeDoneQuizIds(publishedIds);

  // الأرشيف يضمّ: المكتمل تلقائياً + المؤرشف (المحذوف). والنشط ما عداهما.
  const inArchive = (q: (typeof quizzes)[number]) =>
    q.status === "ARCHIVED" || doneIds.has(q.id);
  const activeList = quizzes.filter((q) => !inArchive(q));
  const archiveList = quizzes.filter((q) => inArchive(q));
  const shown = tab === "archive" ? archiveList : activeList;

  const hrefOf = (q: { id: string; isFileBased: boolean }) =>
    q.isFileBased
      ? `/teacher/file-exams/${q.id}`
      : `/teacher/quizzes/${q.id}/edit`;

  const pill = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm transition ${
      active ? "bg-primary text-white" : "bg-ink/5 text-ink/70 hover:bg-primary-light"
    }`;

  return (
    <DashboardShell session={session}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">اختباراتي</h2>
        <div className="flex gap-2">
          {canFileExams && (
            <Link
              href="/teacher/file-exams/new"
              className="rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light"
            >
              + اختبار ورقي
            </Link>
          )}
          <Link href="/teacher/quizzes/new" className="btn-primary">
            + اختبار جديد
          </Link>
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        <Link href="/teacher/quizzes?tab=active" className={pill(tab === "active")}>
          النشطة ({activeList.length})
        </Link>
        <Link href="/teacher/quizzes?tab=archive" className={pill(tab === "archive")}>
          الأرشيف ({archiveList.length})
        </Link>
      </div>

      {shown.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          {tab === "archive"
            ? "لا اختبارات في الأرشيف بعد. تنتقل الاختبارات هنا تلقائياً بعد تصحيحها لكل الطلاب."
            : quizzes.length === 0
            ? "لا توجد اختبارات بعد. أنشئ اختبارك الأول من بنك أسئلتك."
            : "لا اختبارات نشطة حاليّاً."}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((q) => {
            const st = STATUS[q.status as keyof typeof STATUS];
            const purged =
              q.settings && typeof q.settings === "object"
                ? (q.settings as Record<string, unknown>).purged === true
                : false;
            const done = doneIds.has(q.id);
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
                    {done && q.status === "PUBLISHED" && (
                      <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary-dark">
                        مكتمل التصحيح
                      </span>
                    )}
                    {purged && (
                      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        محتوى محذوف
                      </span>
                    )}
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
                    {q._count.sessions > 0 && ` • ${q._count.sessions} محاولة`}
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
