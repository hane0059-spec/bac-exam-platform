// src/app/(dashboard)/admin/users/page.tsx
// المدير: المستخدمون في عرض شجري — تبويب الطلاب (مؤسّسة←صفّ←طلاب) وتبويب المدرّسين/المدراء.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/gender";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import UsersTree, { type TreeNode } from "@/components/admin/UsersTree";
import UserSearchBox from "@/components/admin/UserSearchBox";
import type { Prisma } from "@prisma/client";
import type { Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NO_SCHOOL = "على مستوى المنصّة";
const NO_GRADE = "بلا صفّ";

type Tab = "students" | "staff";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { tab?: string; q?: string };
}) {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  const session = ctx.session;

  const tab: Tab = searchParams.tab === "staff" ? "staff" : "students";
  // مدير المدرسة محصور بمؤسّسته؛ المدير العام يرى الكل.
  const schoolScope = ctx.isSchoolManager ? { schoolId: ctx.schoolId } : {};

  const q = (searchParams.q ?? "").trim();
  const results = q ? await searchUsers(q, schoolScope) : null;

  const roots =
    results !== null
      ? []
      : tab === "students"
      ? await buildStudentRoots(ctx.isSuper, schoolScope)
      : await buildStaffRoots(ctx.isSuper, schoolScope);

  const pill = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm transition ${
      active
        ? "bg-primary text-white"
        : "bg-ink/5 text-ink/70 hover:bg-primary-light"
    }`;

  return (
    <DashboardShell session={session}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">المستخدمون</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/students/new"
            className="rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light"
          >
            + طالب
          </Link>
          <Link href="/admin/users/new" className="btn-primary">
            + مدرّس/مدير
          </Link>
        </div>
      </div>

      <UserSearchBox initial={q} />

      {results !== null ? (
        <>
          <p className="mb-3 text-sm text-ink/50">
            نتائج البحث عن «{q}»: {results.length}
          </p>
          {results.length === 0 ? (
            <div className="card p-8 text-center text-ink/60">
              لا مستخدمين مطابقين.
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((u) => (
                <Link
                  key={u.id}
                  href={u.editHref}
                  className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-primary/40"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.name}</span>
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink/60">
                        {u.badge}
                      </span>
                      {u.inactive && (
                        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink/50">
                          موقوف
                        </span>
                      )}
                    </div>
                    {u.meta && (
                      <p className="mt-0.5 text-xs text-ink/40" dir="ltr">
                        {u.meta}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-primary">تحرير ←</span>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-5 flex gap-2">
            <Link href="/admin/users?tab=students" className={pill(tab === "students")}>
              الطلاب
            </Link>
            <Link href="/admin/users?tab=staff" className={pill(tab === "staff")}>
              المدرّسون والمدراء
            </Link>
          </div>

          <UsersTree
            roots={roots}
            emptyLabel={tab === "students" ? "لا طلاب." : "لا مدرّسون أو مدراء."}
          />
        </>
      )}
    </DashboardShell>
  );
}

// ─────────────────────────────────────────────
// بحث المستخدمين بالاسم/الرمز/البريد/الهاتف (بعزل المؤسّسة لمدير المدرسة).
interface SearchResult {
  id: string;
  name: string;
  badge: string;
  meta?: string;
  inactive: boolean;
  editHref: string;
}

function editHrefFor(role: Role, id: string): string {
  if (role === "STUDENT") return `/admin/students/${id}/edit`;
  if (role === "PARENT") return `/admin/parents/${id}`;
  return `/admin/users/${id}/edit`;
}

async function searchUsers(
  q: string,
  schoolScope: { schoolId?: string | null },
): Promise<SearchResult[]> {
  const tokens = q.split(/\s+/).filter(Boolean);
  const ci = { mode: "insensitive" as const };
  const or: Prisma.UserWhereInput[] = [
    { firstName: { contains: q, ...ci } },
    { lastName: { contains: q, ...ci } },
    { email: { contains: q, ...ci } },
    { phone: { contains: q } },
    { studentProfile: { studentCode: { contains: q, ...ci } } },
    { teacherProfile: { employeeCode: { contains: q, ...ci } } },
  ];
  // اسم كامل «الأول الأخير».
  if (tokens.length >= 2) {
    or.push({
      AND: [
        { firstName: { contains: tokens[0], ...ci } },
        { lastName: { contains: tokens.slice(1).join(" "), ...ci } },
      ],
    });
  }

  const users = await prisma.user.findMany({
    where: { ...schoolScope, OR: or },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
    take: 50,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      gender: true,
      email: true,
      phone: true,
      isActive: true,
      isSuperAdmin: true,
      studentProfile: { select: { studentCode: true } },
      teacherProfile: { select: { employeeCode: true } },
    },
  });

  return users.map((u) => {
    const adminScope =
      u.role === "ADMIN" ? (u.isSuperAdmin ? " عام" : " مؤسّسة") : "";
    const meta = [
      u.studentProfile?.studentCode ?? u.teacherProfile?.employeeCode,
      u.email,
      u.phone,
    ]
      .filter(Boolean)
      .join(" • ");
    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      badge:
        roleLabel(u.role as Role, u.gender as "MALE" | "FEMALE") + adminScope,
      meta: meta || undefined,
      inactive: !u.isActive,
      editHref: editHrefFor(u.role as Role, u.id),
    };
  });
}

// ─────────────────────────────────────────────
// بناء بنية شجرة الطلاب + الأعداد فقط (بلا تحميل الطلاب). العناصر تُجلَب كسولاً
// لكل صفّ عند فتحه عبر /api/admin/users/tree-leaves.
async function buildStudentRoots(
  isSuper: boolean,
  schoolScope: { schoolId?: string | null },
): Promise<TreeNode[]> {
  // إسقاط خفيف (عمودان فقط) لحساب الأعداد لكل (مؤسّسة، صفّ).
  const [rows, schools, grades] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT", ...schoolScope },
      select: { schoolId: true, studentProfile: { select: { gradeLevelId: true } } },
    }),
    prisma.school.findMany({ select: { id: true, name: true } }),
    prisma.gradeLevel.findMany({ select: { id: true, name: true, orderNum: true } }),
  ]);
  const schoolName = new Map(schools.map((s) => [s.id, s.name]));
  const gradeInfo = new Map(grades.map((g) => [g.id, g]));

  // counts: مؤسّسة → صفّ → عدد.
  const counts = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const sk = r.schoolId ?? "__none__";
    const gk = r.studentProfile?.gradeLevelId ?? "__none__";
    if (!counts.has(sk)) counts.set(sk, new Map());
    const gm = counts.get(sk)!;
    gm.set(gk, (gm.get(gk) ?? 0) + 1);
  }

  const gradeNodesFor = (sk: string): TreeNode[] => {
    const gm = counts.get(sk) ?? new Map<string, number>();
    return [...gm.entries()]
      .map(([gk, n]) => ({
        gk,
        n,
        name: gk === "__none__" ? NO_GRADE : gradeInfo.get(gk)?.name ?? NO_GRADE,
        orderNum: gk === "__none__" ? 9999 : gradeInfo.get(gk)?.orderNum ?? 9999,
      }))
      .sort((a, b) => a.orderNum - b.orderNum)
      .map((g) => ({
        id: `${sk}:${g.gk}`,
        label: g.name,
        count: g.n,
        lazy: { kind: "students" as const, school: sk, grade: g.gk },
      }));
  };

  if (!isSuper) {
    // مدير المدرسة: الصفوف مباشرةً (كلّها ضمن مؤسّسته).
    return [...counts.keys()].flatMap((sk) => gradeNodesFor(sk));
  }

  // المدير العام: مؤسّسة ← صفّ.
  return [...counts.entries()]
    .map(([sk, gm]) => ({
      sk,
      name: sk === "__none__" ? NO_SCHOOL : schoolName.get(sk) ?? NO_SCHOOL,
      total: [...gm.values()].reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"))
    .map((s) => ({
      id: s.sk,
      label: s.name,
      count: s.total,
      children: gradeNodesFor(s.sk),
    }));
}

// ─────────────────────────────────────────────
// بناء بنية شجرة المدرّسين/المدراء + الأعداد فقط؛ الأعضاء يُجلَبون كسولاً.
async function buildStaffRoots(
  isSuper: boolean,
  schoolScope: { schoolId?: string | null },
): Promise<TreeNode[]> {
  if (isSuper) {
    // المدير العام: مؤسّسة ← أعضاء (عدّ بالتجميع على schoolId).
    const [grp, schools] = await Promise.all([
      prisma.user.groupBy({
        by: ["schoolId"],
        where: { role: { in: ["TEACHER", "ADMIN"] } },
        _count: { _all: true },
      }),
      prisma.school.findMany({ select: { id: true, name: true } }),
    ]);
    const schoolName = new Map(schools.map((s) => [s.id, s.name]));
    return grp
      .map((g) => ({
        sk: g.schoolId ?? "__none__",
        name: g.schoolId ? schoolName.get(g.schoolId) ?? NO_SCHOOL : NO_SCHOOL,
        count: g._count._all,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"))
      .map((s) => ({
        id: s.sk,
        label: s.name,
        count: s.count,
        lazy: { kind: "staff" as const, school: s.sk },
      }));
  }

  // مدير المدرسة: تجميع حسب الدور (ضمن مؤسّسته).
  const [teachers, admins] = await Promise.all([
    prisma.user.count({ where: { role: "TEACHER", ...schoolScope } }),
    prisma.user.count({ where: { role: "ADMIN", ...schoolScope } }),
  ]);
  const schoolTok = schoolScope.schoolId ?? "__none__";
  const nodes: TreeNode[] = [];
  if (teachers > 0)
    nodes.push({
      id: "teachers",
      label: "المدرّسون",
      count: teachers,
      lazy: { kind: "staff", school: schoolTok, role: "TEACHER" },
    });
  if (admins > 0)
    nodes.push({
      id: "admins",
      label: "المدراء",
      count: admins,
      lazy: { kind: "staff", school: schoolTok, role: "ADMIN" },
    });
  return nodes;
}
