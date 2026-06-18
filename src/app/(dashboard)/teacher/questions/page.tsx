// src/app/(dashboard)/teacher/questions/page.tsx
// بنك أسئلة المدرّس: تشجير (مادة/وحدة/فصل/درس) + ترقيم صفحات.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import DeleteQuestionButton from "@/components/teacher/DeleteQuestionButton";
import QuestionFilters from "@/components/teacher/QuestionFilters";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
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
  searchParams: {
    subjectId?: string;
    unitId?: string;
    chapterId?: string;
    conceptId?: string;
    page?: string;
  };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const { subjectId = "", unitId = "", chapterId = "", conceptId = "" } =
    searchParams;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  // خيارات الفلاتر المتتالية.
  const subjects = await prisma.subject.findMany({
    where: { teacherSubjects: { some: { teacherId: session.sub } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const units = subjectId
    ? await prisma.unit.findMany({
        where: { subjectId },
        select: { id: true, title: true },
        orderBy: { orderNum: "asc" },
      })
    : [];
  const chapters = unitId
    ? await prisma.chapter.findMany({
        where: { unitId },
        select: { id: true, title: true },
        orderBy: { orderNum: "asc" },
      })
    : [];
  const lessons = chapterId
    ? await prisma.concept.findMany({
        where: { chapterId },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      })
    : [];

  const where: Prisma.QuestionWhereInput = {
    creatorId: session.sub,
    isActive: true,
    ...(subjectId ? { subjectId } : {}),
    ...(conceptId
      ? { conceptId }
      : chapterId
      ? { chapterId }
      : unitId
      ? { chapter: { unitId } }
      : {}),
  };

  const [total, questions] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        subject: { select: { name: true } },
        chapter: { select: { title: true } },
        _count: { select: { studentAnswers: true } },
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const q = new URLSearchParams();
    if (subjectId) q.set("subjectId", subjectId);
    if (unitId) q.set("unitId", unitId);
    if (chapterId) q.set("chapterId", chapterId);
    if (conceptId) q.set("conceptId", conceptId);
    q.set("page", String(p));
    return `/teacher/questions?${q}`;
  }

  return (
    <DashboardShell session={session}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">بنك الأسئلة</h2>
        <div className="flex gap-2">
          <Link
            href="/teacher/curriculum"
            className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5"
          >
            بنية المنهج
          </Link>
          <Link href="/teacher/questions/new" className="btn-primary">
            + سؤال جديد
          </Link>
        </div>
      </div>

      <div className="mb-5">
        <QuestionFilters
          subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
          units={units.map((u) => ({ id: u.id, name: u.title }))}
          chapters={chapters.map((c) => ({ id: c.id, name: c.title }))}
          lessons={lessons.map((l) => ({ id: l.id, name: l.title }))}
          current={{ subjectId, unitId, chapterId, conceptId }}
        />
      </div>

      <p className="mb-3 text-sm text-ink/50">{total} سؤال</p>

      {questions.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا أسئلة مطابقة. {total === 0 && "ابدأ بإنشاء سؤال."}
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

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-primary hover:underline">
              ← السابق
            </Link>
          ) : (
            <span className="text-ink/30">← السابق</span>
          )}
          <span className="text-ink/60">
            صفحة {page} من {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="text-primary hover:underline">
              التالي →
            </Link>
          ) : (
            <span className="text-ink/30">التالي →</span>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
