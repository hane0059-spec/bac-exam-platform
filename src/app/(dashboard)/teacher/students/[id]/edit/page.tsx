// src/app/(dashboard)/teacher/students/[id]/edit/page.tsx
// تعديل بيانات طالب + إعادة كلمة السرّ + إدارة التسجيل (المدرّس المُنشئ فقط).
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import StudentForm, {
  type StudentInitial,
} from "@/components/teacher/StudentForm";
import PasswordReset from "@/components/teacher/PasswordReset";
import EnrollmentManager from "@/components/teacher/EnrollmentManager";
import DeleteStudentButton from "@/components/teacher/DeleteStudentButton";
import { teacherCanManageStudents } from "@/lib/teacher";

export const dynamic = "force-dynamic";

export default async function EditStudentPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");
  if (!(await teacherCanManageStudents(session.sub))) redirect("/teacher/students");

  const student = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      studentProfile: true,
      studentEnrollments: {
        where: { teacherId: session.sub, isActive: true },
        select: { subjectId: true },
      },
    },
  });
  // الملكية: المدرّس المُنشئ فقط.
  if (
    !student ||
    student.role !== "STUDENT" ||
    student.createdById !== session.sub
  ) {
    notFound();
  }

  const [subjects, gradeLevels] = await Promise.all([
    prisma.subject.findMany({
      where: { teacherSubjects: { some: { teacherId: session.sub } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.gradeLevel.findMany({
      select: { id: true, name: true },
      orderBy: { orderNum: "asc" },
    }),
  ]);

  const initial: StudentInitial = {
    firstName: student.firstName,
    lastName: student.lastName,
    fatherName: student.studentProfile?.fatherName ?? "",
    motherName: student.studentProfile?.motherName ?? "",
    gender: student.gender as "MALE" | "FEMALE",
    gradeLevelId: student.studentProfile?.gradeLevelId ?? gradeLevels[0]?.id ?? "",
    address: student.studentProfile?.address ?? "",
    studentPhone: student.phone ?? "",
    parentPhone: student.studentProfile?.parentPhone ?? "",
    isActive: student.isActive,
    email: student.email ?? "",
    studentCode: student.studentProfile?.studentCode ?? "",
    creatorNotes: student.creatorNotes ?? "",
    // الملكية مفروضة أعلاه (المدرّس المُنشئ فقط)، فهو دائماً صاحب الملاحظات.
    canEditNotes: true,
  };

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href="/teacher/students"
          className="text-sm text-primary hover:underline"
        >
          ← طلابي
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">
          تعديل: {student.firstName} {student.lastName}
        </h2>
      </div>
      <div className="space-y-5">
        <StudentForm
          mode="edit"
          studentId={student.id}
          subjects={subjects}
          gradeLevels={gradeLevels}
          initial={initial}
        />
        <EnrollmentManager
          studentId={student.id}
          subjects={subjects}
          enrolledIds={student.studentEnrollments.map((e) => e.subjectId)}
        />
        <PasswordReset studentId={student.id} />
        <DeleteStudentButton
          studentId={student.id}
          studentName={`${student.firstName} ${student.lastName}`}
        />
      </div>
    </DashboardShell>
  );
}
