// src/app/(dashboard)/admin/quizzes/page.tsx
// المدير العام: تصفّح الاختبارات عبر المؤسّسات (قراءة فقط + فلترة + ترقيم).
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import QuizFilters from "@/components/admin/QuizFilters";
import type { Prisma, QuizStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const STATUS: Record<QuizStatus, { text: string; cls: string }> = {
  DRAFT: { text: "مسوّدة", cls: "bg-ink/10 text-ink/60" },
  PUBLISHED: { text: "منشور", cls: "bg-primary text-white" },
  ARCHIVED: { text: "مؤرشف", cls: "bg-gold/15 text-gold" },
};

export default async function AdminQuizzesPage({
  searchParams,
}: {
  searchParams: {
    schoolId?: string;
    subjectId?: string;
    status?: string;
    page?: string;
  };
}) {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  if (!ctx.isSuper) redirect("/admin"); // الإشراف العام للمدير العام حصراً

  const schoolId = searchParams.schoolId ?? "";
  const subjectId = searchParams.subjectId ?? "";
  const status = searchParams.status ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  // فلتر المؤسّسة عبر مُنشئ الاختبار؛ «__none__» = على مستوى المنصّة.
  const creatorFilter: Prisma.QuizWhereInput =
    schoolId === "__none__"
      ? { creator: { schoolId: null } }
      : schoolId
      ? { creator: { schoolId } }
      : {};

  const where: Prisma.QuizWhereInput = {
    ...(subjectId ? { subjectId } : {}),
    ...(status ? { status: status as QuizStatus } : {}),
    ...creatorFilter,
  };

  const [schools, subjects, total, quizzes] = await Promise.all([
    prisma.school.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.quiz.count({ where }),
    prisma.quiz.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        subject: { select: { name: true } },
        creator: {
          select: {
            firstName: true,
            lastName: true,
            school: { select: { name: true } },
          },
        },
        _count: { select: { nodes: true, sessions: true, assignments: true } },
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const q = new URLSearchParams();
    if (schoolId) q.set("schoolId", schoolId);
    if (subjectId) q.set("subjectId", subjectId);
    if (status) q.set("status", status);
    q.set("page", String(p));
    return `/admin/quizzes?${q}`;
  }

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← لوحة المدير
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">الاختبارات عبر المؤسّسات</h2>
        <p className="mt-1 text-sm text-ink/60">
          تصفّح اختبارات كل المؤسّسات (قراءة فقط).
        </p>
      </div>

      <div className="mb-5">
        <QuizFilters
          schools={schools}
          subjects={subjects}
          statuses={(Object.keys(STATUS) as QuizStatus[]).map((s) => ({
            id: s,
            name: STATUS[s].text,
          }))}
          current={{ schoolId, subjectId, status }}
        />
      </div>

      <p className="mb-3 text-sm text-ink/50">{total} اختبار</p>

      {quizzes.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">لا اختبارات مطابقة.</div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((q) => {
            const st = STATUS[q.status];
            // عُقد الأسئلة = إجمالي العُقد - (بداية + نهاية) عند وجودها.
            const questionNodes = Math.max(0, q._count.nodes - 2);
            return (
              <div key={q.id} className="card p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}
                  >
                    {st.text}
                  </span>
                  <h3 className="font-display text-lg font-semibold">{q.title}</h3>
                </div>
                <p className="text-sm text-ink/60">
                  {q.subject.name} • {questionNodes} سؤال
                  {q._count.assignments > 0 &&
                    ` • مُسنَد لـ ${q._count.assignments}`}
                  {q._count.sessions > 0 && ` • ${q._count.sessions} محاولة`}
                </p>
                <p className="mt-2 text-xs text-ink/40">
                  {q.creator.firstName} {q.creator.lastName}
                  {q.creator.school
                    ? ` • ${q.creator.school.name}`
                    : " • على مستوى المنصّة"}
                </p>
              </div>
            );
          })}
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
