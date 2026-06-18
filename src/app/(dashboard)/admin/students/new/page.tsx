// src/app/(dashboard)/admin/students/new/page.tsx
// المدير: إنشاء حساب طالب (ضمن مؤسّسته).
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import StudentForm from "@/components/teacher/StudentForm";

export const dynamic = "force-dynamic";

export default async function AdminNewStudentPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");

  const gradeLevels = await prisma.gradeLevel.findMany({
    select: { id: true, name: true },
    orderBy: { orderNum: "asc" },
  });

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin/users" className="text-sm text-primary hover:underline">
          ← المستخدمون
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">طالب جديد</h2>
      </div>
      {gradeLevels.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا صفوف بعد — أنشئها من «المواد والصفوف».
        </div>
      ) : (
        <StudentForm
          mode="create"
          subjects={[]}
          gradeLevels={gradeLevels}
          createEndpoint="/api/admin/students"
          redirectTo="/admin/users"
          showSubject={false}
        />
      )}
    </DashboardShell>
  );
}
