// src/app/(dashboard)/admin/academics/page.tsx
// المدير: إدارة الصفوف والمواد (قوائم قابلة للتحرير + إنشاء).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import AcademicsManager from "@/components/admin/AcademicsManager";
import AcademicsLists from "@/components/admin/AcademicsLists";

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

  const gradeOptions = grades.map((g) => ({ id: g.id, name: g.name }));

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← لوحة المدير
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">المواد والصفوف</h2>
      </div>

      <div className="mb-6">
        <AcademicsLists
          grades={grades.map((g) => ({
            id: g.id,
            name: g.name,
            code: g.code,
            orderNum: g.orderNum,
            subjectsCount: g._count.subjects,
          }))}
          subjects={subjects.map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code,
            gradeLevelId: s.gradeLevelId,
            gradeName: s.gradeLevel.name,
            color: s.color ?? "",
            teachersCount: s._count.teacherSubjects,
          }))}
          gradeOptions={gradeOptions}
        />
      </div>

      <AcademicsManager grades={gradeOptions} />
    </DashboardShell>
  );
}
