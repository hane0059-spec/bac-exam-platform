// src/app/(dashboard)/teacher/students/new/page.tsx
// إنشاء حساب طالب.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import StudentForm from "@/components/teacher/StudentForm";
import { getFieldDefs } from "@/lib/customFields";
import { teacherCanManageStudents } from "@/lib/teacher";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");
  // الإذن يفعّله المدير؛ المنع على الخادم لا الواجهة فقط.
  if (!(await teacherCanManageStudents(session.sub))) redirect("/teacher/students");

  const [subjects, gradeLevels, customFields] = await Promise.all([
    prisma.subject.findMany({
      where: { teacherSubjects: { some: { teacherId: session.sub } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.gradeLevel.findMany({
      select: { id: true, name: true },
      orderBy: { orderNum: "asc" },
    }),
    getFieldDefs("STUDENT"),
  ]);

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href="/teacher/students"
          className="text-sm text-primary hover:underline"
        >
          ← طلابي
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">طالب جديد</h2>
      </div>
      {subjects.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا توجد مواد مسنَدة إليك بعد، فلا يمكن تسجيل طالب.
        </div>
      ) : (
        <StudentForm
          mode="create"
          subjects={subjects}
          gradeLevels={gradeLevels}
          customFields={customFields}
        />
      )}
    </DashboardShell>
  );
}
