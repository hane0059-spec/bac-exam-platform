// src/app/(dashboard)/teacher/questions/public/page.tsx
// البنك العام للمدرّس: أسئلة عامّة (isPublic) في موادّه فقط، مع نسخٍ إلى بنكه.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import MathText from "@/components/MathText";
import CopyPublicQuestionButton from "@/components/teacher/CopyPublicQuestionButton";
import type { Prisma, QuestionType } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "اختيار من متعدد",
  TRUE_FALSE: "صح / خطأ",
  SHORT_ANSWER: "إجابة قصيرة",
  ESSAY: "مقالي",
  ORDER: "ترتيب",
  FILL_BLANK: "ملء الفراغات",
  MATCHING: "مطابقة",
  CALCULATION: "حساب",
  DIAGRAM_LABEL: "توسيم رسم",
};
const DIFF_LABEL: Record<string, string> = {
  EASY: "سهل",
  MEDIUM: "متوسط",
  HARD: "صعب",
  EXPERT: "متقدّم",
};

export default async function TeacherPublicBankPage({
  searchParams,
}: {
  searchParams: { subjectId?: string; type?: string; q?: string; page?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  // موادّ المدرّس (نطاق الرؤية في البنك العام).
  const subjects = await prisma.subject.findMany({
    where: { teacherSubjects: { some: { teacherId: session.sub } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const mySubjectIds = subjects.map((s) => s.id);

  const subjectId =
    searchParams.subjectId && mySubjectIds.includes(searchParams.subjectId)
      ? searchParams.subjectId
      : "";
  const type = searchParams.type ?? "";
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const where: Prisma.QuestionWhereInput = {
    isActive: true,
    isPublic: true,
    subjectId: subjectId ? subjectId : { in: mySubjectIds },
    ...(type ? { type: type as QuestionType } : {}),
    ...(q ? { content: { contains: q, mode: "insensitive" } } : {}),
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
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const sp = new URLSearchParams();
    if (subjectId) sp.set("subjectId", subjectId);
    if (type) sp.set("type", type);
    if (q) sp.set("q", q);
    sp.set("page", String(p));
    return `/teacher/questions/public?${sp}`;
  }

  const selectCls =
    "rounded-xl border border-line bg-surface px-3 py-2 text-sm";

  return (
    <DashboardShell session={session}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">البنك العام</h2>
        <Link
          href="/teacher/questions"
          className="text-sm text-primary hover:underline"
        >
          ← بنكي الخاصّ
        </Link>
      </div>

      <p className="mb-4 text-sm leading-relaxed text-ink/60">
        أسئلة عامّة جاهزة في موادّك. انسخ ما يناسبك إلى بنكك الخاصّ ثمّ عدّله
        واستعمله في اختباراتك.
      </p>

      <form
        method="GET"
        className="mb-5 flex flex-wrap items-end gap-3"
      >
        <label className="block">
          <span className="mb-1 block text-xs text-ink/60">المادة</span>
          <select name="subjectId" defaultValue={subjectId} className={selectCls}>
            <option value="">كل موادّي</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-ink/60">النوع</span>
          <select name="type" defaultValue={type} className={selectCls}>
            <option value="">كل الأنواع</option>
            {Object.entries(TYPE_LABEL).map(([t, l]) => (
              <option key={t} value={t}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="block grow">
          <span className="mb-1 block text-xs text-ink/60">بحث في النصّ</span>
          <input
            name="q"
            defaultValue={q}
            placeholder="كلمة مفتاحية…"
            className={`${selectCls} w-full`}
          />
        </label>
        <button type="submit" className="btn-primary">
          تطبيق
        </button>
      </form>

      <p className="mb-3 text-sm text-ink/50">{total} سؤال عامّ</p>

      {mySubjectIds.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لست مسجّلاً في أيّ مادّة بعد.
        </div>
      ) : questions.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا أسئلة عامّة مطابقة في موادّك بعد.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((qq) => (
            <div key={qq.id} className="card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-primary-light px-2.5 py-0.5 font-medium text-primary-dark">
                  {TYPE_LABEL[qq.type] ?? qq.type}
                </span>
                <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-ink/60">
                  {qq.subject.name}
                </span>
                {qq.chapter && (
                  <span className="text-ink/50">• {qq.chapter.title}</span>
                )}
                <span className="text-ink/50">• {DIFF_LABEL[qq.difficulty]}</span>
                <span className="text-ink/50">• {Number(qq.points)} نقطة</span>
              </div>
              <p className="leading-relaxed">
                <MathText text={qq.content} />
              </p>
              {qq.tags.length > 0 && (
                <p className="mt-1 text-xs text-ink/40">
                  {qq.tags.map((t) => `#${t}`).join("  ")}
                </p>
              )}
              <div className="mt-3">
                <CopyPublicQuestionButton id={qq.id} />
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
