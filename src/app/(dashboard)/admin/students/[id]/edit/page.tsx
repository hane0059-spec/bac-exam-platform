// src/app/(dashboard)/admin/students/[id]/edit/page.tsx
// المدير: تعديل بيانات طالب + إعادة كلمة سرّه (بعزل المؤسّسة).
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import StudentForm, {
  type StudentInitial,
} from "@/components/teacher/StudentForm";
import PasswordResetForm from "@/components/PasswordResetForm";

export const dynamic = "force-dynamic";

export default async function AdminEditStudentPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");

  const student = await prisma.user.findUnique({
    where: { id: params.id },
    include: { studentProfile: true },
  });
  if (!student || student.role !== "STUDENT") notFound();
  // عزل المؤسّسة: مدير المدرسة يعدّل طلاب مؤسّسته فقط.
  if (ctx.isSchoolManager && student.schoolId !== ctx.schoolId) notFound();

  const gradeLevels = await prisma.gradeLevel.findMany({
    select: { id: true, name: true },
    orderBy: { orderNum: "asc" },
  });

  const initial: StudentInitial = {
    firstName: student.firstName,
    lastName: student.lastName,
    fatherName: student.studentProfile?.fatherName ?? "",
    motherName: student.studentProfile?.motherName ?? "",
    gender: student.gender as "MALE" | "FEMALE",
    gradeLevelId:
      student.studentProfile?.gradeLevelId ?? gradeLevels[0]?.id ?? "",
    address: student.studentProfile?.address ?? "",
    studentPhone: student.phone ?? "",
    parentPhone: student.studentProfile?.parentPhone ?? "",
    isActive: student.isActive,
    email: student.email ?? "",
    studentCode: student.studentProfile?.studentCode ?? "",
  };

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin/users" className="text-sm text-primary hover:underline">
          ← المستخدمون
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">
          تعديل طالب: {student.firstName} {student.lastName}
        </h2>
      </div>
      <div className="space-y-5">
        <StudentForm
          mode="edit"
          studentId={student.id}
          subjects={[]}
          gradeLevels={gradeLevels}
          initial={initial}
          updateEndpoint="/api/admin/students"
          redirectTo="/admin/users"
        />
        <PasswordResetForm
          endpoint={`/api/admin/students/${student.id}/password`}
        />
      </div>
    </DashboardShell>
  );
}
