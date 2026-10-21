// src/app/(dashboard)/teacher/students/import/page.tsx
// المدرّس: استيراد طلاب من ملف Excel وتسجيلهم في مادته (بإذن المدير: canManageStudents).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { teacherCanManageStudents } from "@/lib/teacher";
import { remainingStudentQuota } from "@/lib/teacherStudents";
import DashboardShell from "@/components/DashboardShell";
import ExternalImport from "@/components/admin/ExternalImport";

export const dynamic = "force-dynamic";

export default async function TeacherImportStudentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");
  if (!(await teacherCanManageStudents(session.sub))) redirect("/teacher/students");

  const [subjects, grades, remaining] = await Promise.all([
    prisma.subject.findMany({
      where: { teacherSubjects: { some: { teacherId: session.sub } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.gradeLevel.findMany({
      select: { id: true, name: true },
      orderBy: { orderNum: "asc" },
    }),
    remainingStudentQuota(session.sub),
  ]);

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href="/teacher/students"
          className="text-base font-semibold text-red-800 hover:text-red-900 hover:underline"
        >
          ← طلابي
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">استيراد طلاب من ملف</h2>
        <p className="mt-1 text-sm text-ink/60">
          تُنشأ حسابات الطلاب ويُسجَّلون في المادة المختارة، ثم تنزّل بيانات دخولهم
          (رمز الطالب وكلمة السرّ) لتوزيعها. كلمة السرّ تظهر الآن فقط ولا يمكن
          استرجاعها لاحقاً.
        </p>
        {remaining != null && (
          <p className="mt-1 text-sm text-gold">
            المتبقّي من حدّ اشتراكك: {remaining} طالباً.
          </p>
        )}
      </div>
      {subjects.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا توجد مواد مسنَدة إليك بعد، فلا يمكن تسجيل طلاب.
        </div>
      ) : (
        <ExternalImport
          grades={grades}
          subjects={subjects}
          endpoint="/api/teacher/students/import"
        />
      )}
    </DashboardShell>
  );
}
