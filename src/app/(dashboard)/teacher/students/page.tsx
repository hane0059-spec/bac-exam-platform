// src/app/(dashboard)/teacher/students/page.tsx
// قائمة طلاب المدرّس (من إنشائه).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/gender";
import { teacherCanManageStudents } from "@/lib/teacher";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const [students, canManage] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT", createdById: session.sub },
      orderBy: { createdAt: "desc" },
      include: {
        studentProfile: { include: { gradeLevel: { select: { name: true } } } },
        studentEnrollments: {
          where: { teacherId: session.sub, isActive: true },
          include: { subject: { select: { name: true } } },
        },
      },
    }),
    teacherCanManageStudents(session.sub),
  ]);

  return (
    <DashboardShell session={session}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">طلابي</h2>
        {canManage && (
          <Link href="/teacher/students/new" className="btn-primary">
            + طالب جديد
          </Link>
        )}
      </div>

      {!canManage && (
        <p className="mb-4 rounded-xl bg-gold/10 p-3 text-sm text-gold">
          إدارة الطلاب (إضافة/تعديل) يفعّلها لك مدير المؤسّسة عند الطلب. يمكنك
          إسناد الاختبارات لطلابك دائماً.
        </p>
      )}

      {students.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          {canManage
            ? "لا طلاب بعد. أنشئ حساب طالبك الأول وسجّله في مادتك."
            : "لا طلاب من إنشائك."}
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((s) => {
            const inner = (
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
            );
            return canManage ? (
              <Link
                key={s.id}
                href={`/teacher/students/${s.id}/edit`}
                className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-primary/40"
              >
                {inner}
                <span className="text-sm text-primary">تحرير ←</span>
              </Link>
            ) : (
              <div
                key={s.id}
                className="card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
