// src/app/(dashboard)/admin/parents/page.tsx
// المدير: قائمة أولياء الأمور (بعزل المؤسّسة) + عدد الأبناء.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

export default async function AdminParentsPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");

  // مدير المدرسة محصور بمؤسّسته؛ المدير العام يرى الكل.
  const parents = await prisma.user.findMany({
    where: {
      role: "PARENT",
      ...(ctx.isSchoolManager ? { schoolId: ctx.schoolId } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      school: { select: { name: true } },
      _count: { select: { parentLinks: true } },
    },
  });

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-sm text-primary hover:underline">
            ← لوحة المدير
          </Link>
          <h2 className="mt-2 font-display text-xl font-bold">أولياء الأمور</h2>
        </div>
        <Link href="/admin/parents/new" className="btn-primary">
          + ولي أمر
        </Link>
      </div>

      {parents.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا أولياء أمور بعد.
        </div>
      ) : (
        <div className="space-y-2">
          {parents.map((p) => (
            <Link
              key={p.id}
              href={`/admin/parents/${p.id}`}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-primary/40"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {p.firstName} {p.lastName}
                  </span>
                  {!p.isActive && (
                    <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink/50">
                      موقوف
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex gap-2 text-xs text-ink/40">
                  {p.email && <span dir="ltr">{p.email}</span>}
                  {ctx.isSuper && p.school && <span>{p.school.name}</span>}
                </p>
              </div>
              <span className="text-sm text-ink/50">
                {p._count.parentLinks} ابن/ابنة
              </span>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
