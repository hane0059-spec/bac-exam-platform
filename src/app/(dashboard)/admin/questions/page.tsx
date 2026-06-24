// src/app/(dashboard)/admin/questions/page.tsx
// المدير العام: تصفّح البنك العام للأسئلة عبر المؤسّسات (قراءة فقط + فلترة + ترقيم).
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import BankFilters from "@/components/admin/BankFilters";
import type { Prisma, QuestionType } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const TYPE_LABEL: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "اختيار من متعدد",
  TRUE_FALSE: "صح / خطأ",
  SHORT_ANSWER: "إجابة قصيرة",
  ESSAY: "مقالي",
  MATCHING: "مطابقة",
  FILL_BLANK: "ملء فراغ",
  DIAGRAM_LABEL: "تسمية رسم",
  CALCULATION: "حساب",
  ORDER: "ترتيب",
};
const DIFF_LABEL: Record<string, string> = {
  EASY: "سهل",
  MEDIUM: "متوسط",
  HARD: "صعب",
  EXPERT: "متقدّم",
};

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: {
    schoolId?: string;
    subjectId?: string;
    type?: string;
    page?: string;
  };
}) {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  if (!ctx.isSuper) redirect("/admin"); // الإشراف العام للمدير العام حصراً

  const schoolId = searchParams.schoolId ?? "";
  const subjectId = searchParams.subjectId ?? "";
  const type = searchParams.type ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  // فلتر المؤسّسة عبر مُنشئ السؤال؛ «__none__» = على مستوى المنصّة.
  const creatorFilter: Prisma.QuestionWhereInput =
    schoolId === "__none__"
      ? { creator: { schoolId: null } }
      : schoolId
      ? { creator: { schoolId } }
      : {};

  const where: Prisma.QuestionWhereInput = {
    isActive: true,
    ...(subjectId ? { subjectId } : {}),
    ...(type ? { type: type as QuestionType } : {}),
    ...creatorFilter,
  };

  const [schools, subjects, total, questions] = await Promise.all([
    prisma.school.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        subject: { select: { name: true } },
        chapter: { select: { title: true } },
        creator: {
          select: {
            firstName: true,
            lastName: true,
            school: { select: { name: true } },
          },
        },
        _count: { select: { studentAnswers: true } },
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const q = new URLSearchParams();
    if (schoolId) q.set("schoolId", schoolId);
    if (subjectId) q.set("subjectId", subjectId);
    if (type) q.set("type", type);
    q.set("page", String(p));
    return `/admin/questions?${q}`;
  }

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← لوحة المدير
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">البنك العام للأسئلة</h2>
          <Link href="/admin/questions/import" className="btn-primary">
            + استيراد إلى البنك العام
          </Link>
        </div>
        <p className="mt-1 text-sm text-ink/60">
          تصفّح أسئلة كل المؤسّسات (قراءة فقط)، واستورد أسئلةً عامّةً من ملفّ.
        </p>
      </div>

      <div className="mb-5">
        <BankFilters
          basePath="/admin/questions"
          schools={schools}
          subjects={subjects}
          types={(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => ({
            id: t,
            name: TYPE_LABEL[t],
          }))}
          current={{ schoolId, subjectId, type }}
        />
      </div>

      <p className="mb-3 text-sm text-ink/50">{total} سؤال</p>

      {questions.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">لا أسئلة مطابقة.</div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-primary-light px-2.5 py-0.5 font-medium text-primary-dark">
                  {TYPE_LABEL[q.type]}
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
              <p className="mt-2 text-xs text-ink/40">
                {q.creator.firstName} {q.creator.lastName}
                {q.creator.school
                  ? ` • ${q.creator.school.name}`
                  : " • على مستوى المنصّة"}
              </p>
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
