// src/app/(dashboard)/admin/academics/page.tsx
// المدير: إدارة الصفوف والمواد.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import AcademicsManager from "@/components/admin/AcademicsManager";

export const dynamic = "force-dynamic";

export default async function AdminAcademicsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const [grades, subjects] = await Promise.all([
    prisma.gradeLevel.findMany({
      orderBy: { orderNum: "asc" },
      include: { _count: { select: { subjects: true } } },
    }),
    prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        gradeLevel: { select: { name: true } },
        _count: { select: { teacherSubjects: true } },
      },
    }),
  ]);

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← لوحة المدير
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">المواد والصفوف</h2>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 font-display font-semibold">
            الصفوف ({grades.length})
          </h3>
          {grades.length === 0 ? (
            <p className="text-sm text-ink/50">لا صفوف بعد.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {grades.map((g) => (
                <li
                  key={g.id}
                  className="flex justify-between rounded-lg bg-ink/5 px-3 py-1.5"
                >
                  <span>
                    {g.name}{" "}
                    <span className="text-ink/40" dir="ltr">
                      ({g.code})
                    </span>
                  </span>
                  <span className="text-ink/50">{g._count.subjects} مادة</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h3 className="mb-3 font-display font-semibold">
            المواد ({subjects.length})
          </h3>
          {subjects.length === 0 ? (
            <p className="text-sm text-ink/50">لا مواد بعد.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {subjects.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg bg-ink/5 px-3 py-1.5"
                >
                  <span className="flex items-center gap-2">
                    {s.color && (
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                    )}
                    {s.name}
                    <span className="text-ink/40">• {s.gradeLevel.name}</span>
                  </span>
                  <span className="text-ink/50">
                    {s._count.teacherSubjects} مدرّس
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AcademicsManager
        grades={grades.map((g) => ({ id: g.id, name: g.name }))}
      />
    </DashboardShell>
  );
}
