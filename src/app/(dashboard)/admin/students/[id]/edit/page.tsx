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
import AdminEnrollmentManager from "@/components/admin/AdminEnrollmentManager";

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

  const [gradeLevels, teachers, enrollments] = await Promise.all([
    prisma.gradeLevel.findMany({
      select: { id: true, name: true },
      orderBy: { orderNum: "asc" },
    }),
    // مدرّسو مؤسّسة الطالب مع موادّهم.
    prisma.user.findMany({
      where: { role: "TEACHER", schoolId: student.schoolId },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        teacherSubjects: {
          select: { subject: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.studentEnrollment.findMany({
      where: { studentId: student.id, isActive: true },
      select: {
        id: true,
        teacher: { select: { firstName: true, lastName: true } },
        subject: { select: { name: true } },
      },
    }),
  ]);

  // إزالة تكرار مواد المدرّس.
  const teacherOpts = teachers.map((t) => {
    const seen = new Map<string, string>();
    for (const ts of t.teacherSubjects) seen.set(ts.subject.id, ts.subject.name);
    return {
      id: t.id,
      name: `${t.firstName} ${t.lastName}`,
      subjects: [...seen].map(([id, name]) => ({ id, name })),
    };
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
    creatorNotes: student.creatorNotes ?? "",
    // ملاحظات المُنشئ تُعرَض/تُحرَّر لمُنشئ الطالب فقط.
    canEditNotes: student.createdById === ctx.session.sub,
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
        <AdminEnrollmentManager
          studentId={student.id}
          teachers={teacherOpts}
          current={enrollments.map((e) => ({
            id: e.id,
            teacherName: `${e.teacher.firstName} ${e.teacher.lastName}`,
            subjectName: e.subject.name,
          }))}
        />
        <PasswordResetForm
          endpoint={`/api/admin/students/${student.id}/password`}
        />
      </div>
    </DashboardShell>
  );
}
