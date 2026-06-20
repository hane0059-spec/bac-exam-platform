// src/app/(dashboard)/admin/schools/page.tsx
// المدير العام: المدارس/المعاهد ومديروها.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import SchoolsManager from "@/components/admin/SchoolsManager";
import CreatorNotesEditor from "@/components/admin/CreatorNotesEditor";
import { isSoloMode } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminSchoolsPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  if (!ctx.isSuper) redirect("/admin");
  if (await isSoloMode()) redirect("/admin"); // غير متاح في الوضع المبسّط

  const schools = await prisma.school.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true } },
      users: {
        where: { role: "ADMIN" },
        select: { firstName: true, lastName: true },
      },
    },
  });

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← لوحة المدير
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">المدارس والمعاهد</h2>
        <p className="mt-1 text-sm text-ink/60">
          أنشئ المؤسّسات، ثم أنشئ لكلٍّ مديرها من «المستخدمون» (حساب مدير + اختر
          مؤسّسته).
        </p>
      </div>

      <div className="mb-6 space-y-2">
        {schools.length === 0 ? (
          <div className="card p-8 text-center text-ink/60">لا مؤسّسات بعد.</div>
        ) : (
          schools.map((s) => (
            <div
              key={s.id}
              className="card flex flex-wrap items-center justify-between gap-2 p-4"
            >
              <div>
                <span className="font-medium">{s.name}</span>
                <span className="mr-2 rounded-full bg-ink/5 px-2 py-0.5 text-xs text-ink/60">
                  {s.type}
                </span>
              </div>
              <span className="text-sm text-ink/50">
                {s._count.users} مستخدم
                {s.users.length > 0 &&
                  ` · مديرون: ${s.users
                    .map((u) => `${u.firstName} ${u.lastName}`)
                    .join("، ")}`}
              </span>
              {/* ملاحظات المؤسّسة الخاصّة: لمُنشئها وحده. */}
              {s.createdById === ctx.session.sub && (
                <div className="mt-3 w-full border-t border-line pt-3">
                  <CreatorNotesEditor
                    endpoint={`/api/admin/schools/${s.id}`}
                    initialNotes={s.notes ?? ""}
                    about="هذه المؤسّسة"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <SchoolsManager />
    </DashboardShell>
  );
}
