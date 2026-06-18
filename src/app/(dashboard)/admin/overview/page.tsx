// src/app/(dashboard)/admin/overview/page.tsx
// المدير العام: نظرة عامة وإشراف عبر المؤسّسات (قراءة فقط).
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

const NO_SCHOOL = "على مستوى المنصّة";

// إحصاءات مؤسّسة واحدة (schoolId=null = على مستوى المنصّة).
async function statsFor(schoolId: string | null) {
  const [teachers, students, questions, quizzes, sessions] = await Promise.all([
    prisma.user.count({ where: { schoolId, role: "TEACHER" } }),
    prisma.user.count({ where: { schoolId, role: "STUDENT" } }),
    prisma.question.count({ where: { creator: { schoolId } } }),
    prisma.quiz.count({ where: { creator: { schoolId } } }),
    prisma.examSession.count({ where: { quiz: { creator: { schoolId } } } }),
  ]);
  return { teachers, students, questions, quizzes, sessions };
}

export default async function AdminOverviewPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  if (!ctx.isSuper) redirect("/admin"); // الإشراف العام للمدير العام حصراً

  const schools = await prisma.school.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true },
  });

  // إحصاءات المنصّة كلّها + لكل مؤسّسة + صفّ «بلا مؤسّسة».
  const [totals, perSchool, platformScope] = await Promise.all([
    Promise.all([
      prisma.school.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "TEACHER" } }),
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.question.count(),
      prisma.quiz.count(),
      prisma.examSession.count(),
    ]),
    Promise.all(schools.map((s) => statsFor(s.id))),
    statsFor(null),
  ]);
  const [
    schoolCount,
    adminCount,
    teacherCount,
    studentCount,
    questionCount,
    quizCount,
    sessionCount,
  ] = totals;

  const cards = [
    { label: "المؤسّسات", value: schoolCount },
    { label: "المدراء", value: adminCount },
    { label: "المدرّسون", value: teacherCount },
    { label: "الطلاب", value: studentCount },
    { label: "الأسئلة", value: questionCount },
    { label: "الاختبارات", value: quizCount },
    { label: "محاولات الأداء", value: sessionCount },
  ];

  // صفوف الجدول: المؤسّسات ثم «بلا مؤسّسة» إن كان فيها نشاط.
  const platformHasActivity =
    platformScope.teachers +
      platformScope.students +
      platformScope.questions +
      platformScope.quizzes +
      platformScope.sessions >
    0;
  const rows = [
    ...schools.map((s, i) => ({
      key: s.id,
      name: s.name,
      type: s.type ?? "",
      ...perSchool[i],
    })),
    ...(platformHasActivity
      ? [{ key: "__none__", name: NO_SCHOOL, type: "", ...platformScope }]
      : []),
  ];

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← لوحة المدير
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">نظرة عامة وإشراف</h2>
        <p className="mt-1 text-sm text-ink/60">
          إحصاءات المنصّة كلّها وتوزّعها على المؤسّسات.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-sm text-ink/60">{c.label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <h3 className="mb-3 font-display font-semibold">حسب المؤسّسة</h3>
      {rows.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">لا مؤسّسات بعد.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead className="border-b border-line text-xs text-ink/50">
              <tr>
                <th className="p-3 font-medium">المؤسّسة</th>
                <th className="p-3 font-medium">مدرّسون</th>
                <th className="p-3 font-medium">طلاب</th>
                <th className="p-3 font-medium">أسئلة</th>
                <th className="p-3 font-medium">اختبارات</th>
                <th className="p-3 font-medium">محاولات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-line/60 last:border-0">
                  <td className="p-3">
                    <span className="font-medium">{r.name}</span>
                    {r.type && (
                      <span className="mr-2 rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink/50">
                        {r.type}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-ink/70">{r.teachers}</td>
                  <td className="p-3 text-ink/70">{r.students}</td>
                  <td className="p-3 text-ink/70">{r.questions}</td>
                  <td className="p-3 text-ink/70">{r.quizzes}</td>
                  <td className="p-3 text-ink/70">{r.sessions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}
