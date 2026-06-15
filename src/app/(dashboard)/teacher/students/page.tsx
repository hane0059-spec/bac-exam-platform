// src/app/(dashboard)/teacher/students/page.tsx
// قائمة طلاب المدرّس (من إنشائه).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/gender";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const students = await prisma.user.findMany({
    where: { role: "STUDENT", createdById: session.sub },
    orderBy: { createdAt: "desc" },
    include: {
      studentProfile: { include: { gradeLevel: { select: { name: true } } } },
      studentEnrollments: {
        where: { teacherId: session.sub, isActive: true },
        include: { subject: { select: { name: true } } },
      },
    },
  });

  return (
    <DashboardShell session={session}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">طلابي</h2>
        <Link href="/teacher/students/new" className="btn-primary">
          + طالب جديد
        </Link>
      </div>

      {students.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا طلاب بعد. أنشئ حساب طالبك الأول وسجّله في مادتك.
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <Link
              key={s.id}
              href={`/teacher/students/${s.id}/edit`}
              className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-primary/40"
            >
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
              <span className="text-sm text-primary">تحرير ←</span>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
