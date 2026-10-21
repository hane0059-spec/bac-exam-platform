// src/app/(dashboard)/teacher/students/page.tsx
// طلاب المدرّس: قائمة + بحث (بالاسم/الرمز/البريد/الهاتف) ضمن طلابه (إنشاءً أو تسجيلاً).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/gender";
import { teacherCanManageStudents } from "@/lib/teacher";
import DashboardShell from "@/components/DashboardShell";
import UserSearchBox from "@/components/admin/UserSearchBox";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// شروط البحث النصّي (اسم/رمز/بريد/هاتف).
function searchConditions(q: string): Prisma.UserWhereInput[] {
  const ci = { mode: "insensitive" as const };
  const tokens = q.split(/\s+/).filter(Boolean);
  const or: Prisma.UserWhereInput[] = [
    { firstName: { contains: q, ...ci } },
    { lastName: { contains: q, ...ci } },
    { email: { contains: q, ...ci } },
    { phone: { contains: q } },
    { studentProfile: { studentCode: { contains: q, ...ci } } },
  ];
  if (tokens.length >= 2) {
    or.push({
      AND: [
        { firstName: { contains: tokens[0], ...ci } },
        { lastName: { contains: tokens.slice(1).join(" "), ...ci } },
      ],
    });
  }
  return or;
}

export default async function TeacherStudentsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const q = (searchParams.q ?? "").trim();

  // طلاب المدرّس: من إنشائه أو المسجّلين معه. عند البحث نشمل الجميع ضمن نطاقه.
  const scopeOr: Prisma.UserWhereInput[] = [
    { createdById: session.sub },
    { studentEnrollments: { some: { teacherId: session.sub, isActive: true } } },
  ];
  const where: Prisma.UserWhereInput = q
    ? { role: "STUDENT", AND: [{ OR: scopeOr }, { OR: searchConditions(q) }] }
    : { role: "STUDENT", createdById: session.sub };

  const [students, canManage, profile, createdCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: q ? [{ firstName: "asc" }] : { createdAt: "desc" },
      take: q ? 50 : undefined,
      include: {
        studentProfile: { include: { gradeLevel: { select: { name: true, orderNum: true } } } },
        studentEnrollments: {
          where: { teacherId: session.sub, isActive: true },
          include: { subject: { select: { id: true, name: true } } },
        },
      },
    }),
    teacherCanManageStudents(session.sub),
    prisma.teacherProfile.findUnique({
      where: { userId: session.sub },
      select: { isIndependent: true, studentLimit: true },
    }),
    prisma.user.count({ where: { role: "STUDENT", createdById: session.sub } }),
  ]);
  // مدرّس مستقلّ: حصّة الطلاب حسب الاشتراك.
  const quota =
    profile?.isIndependent && profile.studentLimit != null
      ? { used: createdCount, limit: profile.studentLimit }
      : null;
  const quotaFull = quota != null && quota.used >= quota.limit;

  type Row = (typeof students)[number];
  function renderCard(s: Row) {
    return (
      <Link
        key={s.id}
        href={`/teacher/students/${s.id}`}
        className="card-link flex flex-wrap items-center justify-between gap-3 p-4"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {s.firstName} {s.lastName}
            </span>
            <span className="text-xs text-ink/40">
              {roleLabel("STUDENT", s.gender)} • {s.studentProfile?.studentCode}
            </span>
            {!s.isActive && (
              <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink/50">
                موقوف
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-ink/60">
            {s.studentProfile?.gradeLevel?.name}
            {s.studentEnrollments.length > 0 &&
              ` • ${s.studentEnrollments.map((e) => e.subject.name).join("، ")}`}
          </p>
        </div>
        <span className="text-sm text-primary">إسناد اختبار ←</span>
      </Link>
    );
  }

  // تقسيم حسب الصفّ ثم المادة (الطالب المسجَّل في أكثر من مادة يظهر تحت كلٍّ منها).
  const NO_SUBJECT = "بلا مادة مسجَّل فيها";
  const NO_GROUP = "بلا مجموعة";
  const gradeMap = new Map<
    string,
    { order: number; subjects: Map<string, Map<string, Row[]>> }
  >();
  for (const s of students) {
    const gName = s.studentProfile?.gradeLevel?.name ?? "بلا صفّ";
    const gOrder = s.studentProfile?.gradeLevel?.orderNum ?? 9999;
    const g = gradeMap.get(gName) ?? { order: gOrder, subjects: new Map() };
    gradeMap.set(gName, g);
    const placements = s.studentEnrollments.length
      ? s.studentEnrollments.map((e) => ({
          sub: e.subject.name,
          grp: e.groupName?.trim() || NO_GROUP,
        }))
      : [{ sub: NO_SUBJECT, grp: NO_GROUP }];
    for (const { sub, grp } of placements) {
      const byGroup = g.subjects.get(sub) ?? new Map<string, Row[]>();
      g.subjects.set(sub, byGroup);
      const list = byGroup.get(grp) ?? [];
      list.push(s);
      byGroup.set(grp, list);
    }
  }
  const groups = [...gradeMap.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([gradeName, g]) => ({
      gradeName,
      total: new Set(
        [...g.subjects.values()].flatMap((m) => [...m.values()].flat()).map((x) => x.id)
      ).size,
      subjects: [...g.subjects.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], "ar"))
        .map(([name, byGroup]) => ({
          name,
          count: new Set([...byGroup.values()].flat().map((x) => x.id)).size,
          groups: [...byGroup.entries()]
            .sort((a, b) =>
              a[0] === NO_GROUP ? 1 : b[0] === NO_GROUP ? -1 : a[0].localeCompare(b[0], "ar")
            )
            .map(([groupName, list]) => ({
              name: groupName,
              students: [...list].sort((a, b) =>
                `${a.firstName} ${a.lastName}`.localeCompare(
                  `${b.firstName} ${b.lastName}`,
                  "ar"
                )
              ),
            })),
        })),
    }));

  return (
    <DashboardShell session={session}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-display text-xl font-bold">طلابي</h2>
          {quota && (
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                quotaFull ? "bg-red-100 text-red-700" : "bg-primary-light text-primary-dark"
              }`}
              dir="ltr"
            >
              {quota.used} / {quota.limit}
            </span>
          )}
        </div>
        {canManage &&
          (quotaFull ? (
            <span className="cursor-not-allowed rounded-xl bg-ink/10 px-4 py-2 text-sm font-medium text-ink/40">
              بلغتَ حدّ الاشتراك
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/teacher/students/import"
                className="rounded-xl border border-line px-4 py-2 text-sm font-medium transition hover:bg-ink/5"
              >
                استيراد من ملف
              </Link>
              <Link href="/teacher/students/new" className="btn-primary">
                + طالب جديد
              </Link>
            </div>
          ))}
      </div>

      <UserSearchBox
        initial={q}
        basePath="/teacher/students"
        placeholder="ابحث في طلابك بالاسم أو الرمز أو البريد أو الهاتف"
      />

      {!canManage && (
        <p className="mb-4 rounded-xl bg-gold/10 p-3 text-sm text-gold">
          إدارة الطلاب (إضافة/تعديل) يفعّلها لك مدير المؤسّسة عند الطلب. يمكنك
          إسناد الاختبارات لطلابك دائماً.
        </p>
      )}

      {q && (
        <p className="mb-3 text-sm text-ink/50">
          نتائج البحث عن «{q}»: {students.length}
        </p>
      )}

      {students.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          {q
            ? "لا طلاب مطابقون."
            : canManage
            ? "لا طلاب بعد. أنشئ حساب طالبك الأول وسجّله في مادتك."
            : "لا طلاب من إنشائك."}
        </div>
      ) : q ? (
        <div className="space-y-3">{students.map((s) => renderCard(s))}</div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.gradeName}>
              <h3 className="mb-2 font-display text-lg font-bold">
                {g.gradeName}
                <span className="mr-2 text-sm font-normal text-ink/50">
                  ({g.total} طالباً)
                </span>
              </h3>
              <div className="space-y-2">
                {g.subjects.map((sub) => (
                  <details
                    key={sub.name}
                    open={g.subjects.length === 1}
                    className="card group p-0"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-medium">
                      <span>{sub.name}</span>
                      <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary-dark">
                        {sub.count}
                      </span>
                    </summary>
                    <div className="space-y-2 border-t border-line p-3">
                      {sub.groups.length === 1 && sub.groups[0].name === NO_GROUP
                        ? sub.groups[0].students.map((s) => renderCard(s))
                        : sub.groups.map((grp) => (
                            <details
                              key={grp.name}
                              open={sub.groups.length === 1}
                              className="rounded-xl border border-line"
                            >
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium">
                                <span>{grp.name}</span>
                                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">
                                  {grp.students.length}
                                </span>
                              </summary>
                              <div className="space-y-2 border-t border-line p-2">
                                {grp.students.map((s) => renderCard(s))}
                              </div>
                            </details>
                          ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
