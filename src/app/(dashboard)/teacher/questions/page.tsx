// src/app/(dashboard)/teacher/questions/page.tsx
// قائمة أسئلة المدرّس مع فلترة بالمادة.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import DeleteQuestionButton from "@/components/teacher/DeleteQuestionButton";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "اختيار من متعدد",
  TRUE_FALSE: "صح / خطأ",
  SHORT_ANSWER: "إجابة قصيرة",
};
const DIFF_LABEL: Record<string, string> = {
  EASY: "سهل",
  MEDIUM: "متوسط",
  HARD: "صعب",
  EXPERT: "متقدّم",
};

export default async function TeacherQuestionsPage({
  searchParams,
}: {
  searchParams: { subjectId?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const subjects = await prisma.subject.findMany({
    where: { teacherSubjects: { some: { teacherId: session.sub } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const activeSubject = searchParams.subjectId;
  const questions = await prisma.question.findMany({
    where: {
      creatorId: session.sub,
      isActive: true,
      ...(activeSubject ? { subjectId: activeSubject } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      subject: { select: { name: true } },
      chapter: { select: { title: true } },
      _count: { select: { studentAnswers: true } },
    },
  });

  return (
    <DashboardShell session={session}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">بنك الأسئلة</h2>
        <Link href="/teacher/questions/new" className="btn-primary">
          + سؤال جديد
        </Link>
      </div>

      {/* فلترة بالمادة */}
      {subjects.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Link
            href="/teacher/questions"
            className={`rounded-full px-3 py-1 text-sm ${
              !activeSubject
                ? "bg-primary text-white"
                : "bg-ink/5 text-ink/70 hover:bg-primary-light"
            }`}
          >
            الكل
          </Link>
          {subjects.map((s) => (
            <Link
              key={s.id}
              href={`/teacher/questions?subjectId=${s.id}`}
              className={`rounded-full px-3 py-1 text-sm ${
                activeSubject === s.id
                  ? "bg-primary text-white"
                  : "bg-ink/5 text-ink/70 hover:bg-primary-light"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      {questions.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا توجد أسئلة بعد. ابدأ بإنشاء سؤالك الأول.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-primary-light px-2.5 py-0.5 font-medium text-primary-dark">
                  {TYPE_LABEL[q.type] ?? q.type}
                </span>
                <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-ink/60">
                  {q.subject.name}
                </span>
                {q.chapter && (
                  <span className="text-ink/50">• {q.chapter.title}</span>
                )}
                <span className="text-ink/50">• {DIFF_LABEL[q.difficulty]}</span>
                <span className="text-ink/50">• {Number(q.points)} نقطة</span>
                {q._count.studentAnswers > 0 && (
                  <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-gold">
                    مُستخدَم
                  </span>
                )}
              </div>
              <p className="leading-relaxed">{q.content}</p>
              {q.tags.length > 0 && (
                <p className="mt-1 text-xs text-ink/40">
                  {q.tags.map((t) => `#${t}`).join("  ")}
                </p>
              )}
              <div className="mt-3 flex gap-4">
                <Link
                  href={`/teacher/questions/${q.id}/edit`}
                  className="text-sm text-primary hover:underline"
                >
                  تعديل
                </Link>
                <DeleteQuestionButton id={q.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
