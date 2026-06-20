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

  const [students, canManage] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: q ? [{ firstName: "asc" }] : { createdAt: "desc" },
      take: q ? 50 : undefined,
      include: {
        studentProfile: { include: { gradeLevel: { select: { name: true } } } },
        studentEnrollments: {
          where: { teacherId: session.sub, isActive: true },
          include: { subject: { select: { name: true } } },
        },
      },
    }),
    teacherCanManageStudents(session.sub),
  ]);

  return (
    <DashboardShell session={session}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">طلابي</h2>
        {canManage && (
          <Link href="/teacher/students/new" className="btn-primary">
            + طالب جديد
          </Link>
        )}
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
      ) : (
        <div className="space-y-3">
          {students.map((s) => {
            const inner = (
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {s.firstName} {s.lastName}
                  </span>
                  <span className="text-xs text-ink/40">
                    {roleLabel("STUDENT", s.gender)} •{" "}
                    {s.studentProfile?.studentCode}
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
                    ` • ${s.studentEnrollments
                      .map((e) => e.subject.name)
                      .join("، ")}`}
                </p>
              </div>
            );
            return (
              <Link
                key={s.id}
                href={`/teacher/students/${s.id}`}
                className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-primary/40"
              >
                {inner}
                <span className="text-sm text-primary">إسناد اختبار ←</span>
              </Link>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
