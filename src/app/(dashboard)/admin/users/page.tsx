// src/app/(dashboard)/admin/users/page.tsx
// المدير: قائمة المستخدمين بتصفية بالدور والمؤسّسة وترقيم صفحات.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/gender";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import type { Role } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const FILTERS = [
  { key: "", label: "الكل" },
  { key: "TEACHER", label: "المدرّسون" },
  { key: "ADMIN", label: "المدراء" },
  { key: "STUDENT", label: "الطلاب" },
] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { role?: string; schoolId?: string; page?: string };
}) {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  const session = ctx.session;

  const roleFilter = searchParams.role ?? "";
  // المدير العام يفلتر بالمؤسّسة؛ مدير المدرسة محصور بمؤسّسته.
  const schoolFilter = ctx.isSchoolManager
    ? ctx.schoolId
    : searchParams.schoolId || undefined;
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const where = {
    ...(roleFilter ? { role: roleFilter as Role } : {}),
    ...(schoolFilter ? { schoolId: schoolFilter } : {}),
  };

  const [total, users, schools] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        gender: true,
        email: true,
        isActive: true,
        isSuperAdmin: true,
        teacherProfile: { select: { employeeCode: true } },
        studentProfile: { select: { studentCode: true } },
      },
    }),
    ctx.isSuper
      ? prisma.school.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (over: Record<string, string>) => {
    const q = new URLSearchParams();
    if (roleFilter) q.set("role", roleFilter);
    if (!ctx.isSchoolManager && searchParams.schoolId)
      q.set("schoolId", searchParams.schoolId);
    for (const [k, v] of Object.entries(over)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    return `/admin/users${q.toString() ? `?${q}` : ""}`;
  };

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

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={qs({ role: f.key, page: "" })}
            className={`rounded-full px-3 py-1 text-sm ${
              roleFilter === f.key
                ? "bg-primary text-white"
                : "bg-ink/5 text-ink/70 hover:bg-primary-light"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {ctx.isSuper && schools.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Link
            href={qs({ schoolId: "", page: "" })}
            className={`rounded-full px-3 py-1 text-sm ${
              !searchParams.schoolId
                ? "bg-gold/20 text-gold"
                : "bg-ink/5 text-ink/60 hover:bg-gold/10"
            }`}
          >
            كل المؤسّسات
          </Link>
          {schools.map((s) => (
            <Link
              key={s.id}
              href={qs({ schoolId: s.id, page: "" })}
              className={`rounded-full px-3 py-1 text-sm ${
                searchParams.schoolId === s.id
                  ? "bg-gold/20 text-gold"
                  : "bg-ink/5 text-ink/60 hover:bg-gold/10"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <p className="mb-3 text-sm text-ink/50">{total} مستخدم</p>

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
                        (u.isSuperAdmin ? " عام" : " مؤسّسة")}
                    </span>
                    {!u.isActive && (
                      <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink/50">
                        موقوف
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 flex gap-2 text-xs text-ink/40" dir="ltr">
                    {(u.teacherProfile?.employeeCode ||
                      u.studentProfile?.studentCode) && (
                      <span>
                        {u.teacherProfile?.employeeCode ??
                          u.studentProfile?.studentCode}
                      </span>
                    )}
                    {u.email && <span>{u.email}</span>}
                  </p>
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

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3 text-sm">
          {page > 1 ? (
            <Link href={qs({ page: String(page - 1) })} className="text-primary hover:underline">
              ← السابق
            </Link>
          ) : (
            <span className="text-ink/30">← السابق</span>
          )}
          <span className="text-ink/60">
            صفحة {page} من {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={qs({ page: String(page + 1) })} className="text-primary hover:underline">
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
