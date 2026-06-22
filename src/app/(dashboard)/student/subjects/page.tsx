// src/app/(dashboard)/student/subjects/page.tsx
// مواد الطالب المسجَّل فيها ومدرّسوها (قراءة فقط).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/gender";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

export default async function StudentSubjectsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "STUDENT") redirect("/");

  const enrollments = await prisma.studentEnrollment.findMany({
    where: { studentId: session.sub, isActive: true },
    include: {
      subject: { select: { id: true, name: true } },
      teacher: { select: { firstName: true, lastName: true, gender: true } },
    },
    orderBy: { enrolledAt: "asc" },
  });

  // تجميع حسب المادة (قد يكون لها أكثر من مدرّس).
  const bySubject = new Map<
    string,
    { name: string; teachers: { name: string; gender: string }[] }
  >();
  for (const e of enrollments) {
    let s = bySubject.get(e.subject.id);
    if (!s) {
      s = { name: e.subject.name, teachers: [] };
      bySubject.set(e.subject.id, s);
    }
    s.teachers.push({
      name: `${e.teacher.firstName} ${e.teacher.lastName}`,
      gender: e.teacher.gender,
    });
  }
  const subjects = [...bySubject.values()];

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/student" className="text-sm text-primary hover:underline">
          ← الرئيسية
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">مواد دراستي</h2>
        <p className="mt-1 text-sm text-ink/60">
          المواد المسجَّل فيها ومدرّسوها.
        </p>
      </div>

      {subjects.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لم تُسجَّل في أيّ مادة بعد. تواصل مع مدرّسك أو إدارة مؤسّستك.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <div key={s.name} className="card p-5">
              <h3 className="mb-2 font-display text-lg font-semibold">
                {s.name}
              </h3>
              <ul className="space-y-1 text-sm text-ink/70">
                {s.teachers.map((t, i) => (
                  <li key={i}>
                    {roleLabel("TEACHER", t.gender as "MALE" | "FEMALE")}:{" "}
                    {t.name}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
