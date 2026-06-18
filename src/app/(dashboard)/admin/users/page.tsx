// src/app/(dashboard)/admin/users/page.tsx
// المدير: قائمة المستخدمين مع تصفية بالدور.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/gender";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import type { Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "", label: "الكل" },
  { key: "TEACHER", label: "المدرّسون" },
  { key: "ADMIN", label: "المدراء" },
  { key: "STUDENT", label: "الطلاب" },
] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { role?: string };
}) {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  const session = ctx.session;

  const roleFilter = searchParams.role;
  const users = await prisma.user.findMany({
    where: {
      ...(roleFilter ? { role: roleFilter as Role } : {}),
      // مدير المدرسة يرى مستخدمي مؤسّسته فقط.
      ...(ctx.isSchoolManager ? { schoolId: ctx.schoolId } : {}),
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      gender: true,
      email: true,
      isActive: true,
      isSuperAdmin: true,
    },
  });

  return (
    <DashboardShell session={session}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">المستخدمون</h2>
        <Link href="/admin/users/new" className="btn-primary">
          + حساب جديد
        </Link>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/admin/users?role=${f.key}` : "/admin/users"}
            className={`rounded-full px-3 py-1 text-sm ${
              (roleFilter ?? "") === f.key
                ? "bg-primary text-white"
                : "bg-ink/5 text-ink/70 hover:bg-primary-light"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {users.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">لا مستخدمون.</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const editable = u.role !== "STUDENT";
            return (
              <div
                key={u.id}
                className="card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {u.firstName} {u.lastName}
                    </span>
                    <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink/60">
                      {roleLabel(u.role as Role, u.gender as "MALE" | "FEMALE")}
                      {u.role === "ADMIN" &&
                        (u.isSuperAdmin ? " عام" : " تنفيذي")}
                    </span>
                    {!u.isActive && (
                      <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink/50">
                        موقوف
                      </span>
                    )}
                  </div>
                  {u.email && (
                    <p className="mt-0.5 text-xs text-ink/40" dir="ltr">
                      {u.email}
                    </p>
                  )}
                </div>
                {editable ? (
                  <Link
                    href={`/admin/users/${u.id}/edit`}
                    className="text-sm text-primary hover:underline"
                  >
                    تحرير
                  </Link>
                ) : (
                  <span className="text-xs text-ink/40">يُدار من مدرّسه</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
