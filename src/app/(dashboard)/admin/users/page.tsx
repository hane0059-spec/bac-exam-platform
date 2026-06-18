// src/app/(dashboard)/admin/users/page.tsx
// المدير: المستخدمون في عرض شجري — تبويب الطلاب (مؤسّسة←صفّ←طلاب) وتبويب المدرّسين/المدراء.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/gender";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import UsersTree, { type TreeNode, type LeafItem } from "@/components/admin/UsersTree";
import type { Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NO_SCHOOL = "على مستوى المنصّة";
const NO_GRADE = "بلا صفّ";

type Tab = "students" | "staff";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  const session = ctx.session;

  const tab: Tab = searchParams.tab === "staff" ? "staff" : "students";
  // مدير المدرسة محصور بمؤسّسته؛ المدير العام يرى الكل.
  const schoolScope = ctx.isSchoolManager ? { schoolId: ctx.schoolId } : {};

  const roots =
    tab === "students"
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
        <div className="flex gap-2">
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
    </DashboardShell>
  );
}

// ─────────────────────────────────────────────
// بناء شجرة الطلاب: مؤسّسة ← صفّ ← طلاب (للمدير العام)، أو صفّ ← طلاب (لمدير المدرسة).
async function buildStudentRoots(
  isSuper: boolean,
  schoolScope: { schoolId?: string | null },
): Promise<TreeNode[]> {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", ...schoolScope },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      isActive: true,
      schoolId: true,
      school: { select: { name: true } },
      studentProfile: {
        select: {
          studentCode: true,
          gradeLevel: { select: { id: true, name: true, orderNum: true } },
        },
      },
    },
  });

  const toLeaf = (s: (typeof students)[number]): LeafItem => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    meta: s.studentProfile?.studentCode ?? undefined,
    inactive: !s.isActive,
    managedNote: "يُدار من مدرّسه", // الطالب يُحرّر من مدرّسه (اتساقاً مع القرار المثبّت)
  });

  // تجميع حسب الصفّ ضمن مجموعة معطاة.
  const gradeNodes = (rows: typeof students): TreeNode[] => {
    const byGrade = new Map<
      string,
      { name: string; orderNum: number; leaves: LeafItem[] }
    >();
    for (const s of rows) {
      const g = s.studentProfile?.gradeLevel;
      const key = g?.id ?? "__none__";
      if (!byGrade.has(key))
        byGrade.set(key, {
          name: g?.name ?? NO_GRADE,
          orderNum: g?.orderNum ?? 9999,
          leaves: [],
        });
      byGrade.get(key)!.leaves.push(toLeaf(s));
    }
    return [...byGrade.entries()]
      .sort((a, b) => a[1].orderNum - b[1].orderNum)
      .map(([id, v]) => ({
        id,
        label: v.name,
        count: v.leaves.length,
        leaves: v.leaves,
      }));
  };

  if (!isSuper) {
    // مدير المدرسة: الصفوف مباشرةً.
    return gradeNodes(students);
  }

  // المدير العام: مؤسّسة ← صفّ ← طلاب.
  const bySchool = new Map<
    string,
    { name: string; rows: typeof students }
  >();
  for (const s of students) {
    const key = s.schoolId ?? "__none__";
    if (!bySchool.has(key))
      bySchool.set(key, { name: s.school?.name ?? NO_SCHOOL, rows: [] });
    bySchool.get(key)!.rows.push(s);
  }
  return [...bySchool.entries()]
    .sort((a, b) => a[1].name.localeCompare(b[1].name, "ar"))
    .map(([id, v]) => ({
      id,
      label: v.name,
      count: v.rows.length,
      children: gradeNodes(v.rows),
    }));
}

// ─────────────────────────────────────────────
// بناء شجرة المدرّسين/المدراء: مؤسّسة ← أعضاء (للمدير العام)، أو حسب الدور (لمدير المدرسة).
async function buildStaffRoots(
  isSuper: boolean,
  schoolScope: { schoolId?: string | null },
): Promise<TreeNode[]> {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["TEACHER", "ADMIN"] }, ...schoolScope },
    orderBy: [{ role: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      gender: true,
      isActive: true,
      isSuperAdmin: true,
      email: true,
      schoolId: true,
      school: { select: { name: true } },
      teacherProfile: { select: { employeeCode: true } },
    },
  });

  const toLeaf = (u: (typeof staff)[number]): LeafItem => {
    const adminScope =
      u.role === "ADMIN" ? (u.isSuperAdmin ? " عام" : " مؤسّسة") : "";
    const meta = [u.teacherProfile?.employeeCode, u.email]
      .filter(Boolean)
      .join(" • ");
    return {
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      badge: roleLabel(u.role as Role, u.gender as "MALE" | "FEMALE") + adminScope,
      meta: meta || undefined,
      inactive: !u.isActive,
      editHref: `/admin/users/${u.id}/edit`,
    };
  };

  if (!isSuper) {
    // مدير المدرسة: تجميع حسب الدور.
    const groups: { id: string; label: string; roles: Role[] }[] = [
      { id: "teachers", label: "المدرّسون", roles: ["TEACHER"] },
      { id: "admins", label: "المدراء", roles: ["ADMIN"] },
    ];
    return groups
      .map((g) => {
        const leaves = staff
          .filter((u) => g.roles.includes(u.role as Role))
          .map(toLeaf);
        return { id: g.id, label: g.label, count: leaves.length, leaves };
      })
      .filter((n) => n.count > 0);
  }

  // المدير العام: مؤسّسة ← أعضاء.
  const bySchool = new Map<string, { name: string; leaves: LeafItem[] }>();
  for (const u of staff) {
    const key = u.schoolId ?? "__none__";
    if (!bySchool.has(key))
      bySchool.set(key, { name: u.school?.name ?? NO_SCHOOL, leaves: [] });
    bySchool.get(key)!.leaves.push(toLeaf(u));
  }
  return [...bySchool.entries()]
    .sort((a, b) => a[1].name.localeCompare(b[1].name, "ar"))
    .map(([id, v]) => ({
      id,
      label: v.name,
      count: v.leaves.length,
      leaves: v.leaves,
    }));
}
