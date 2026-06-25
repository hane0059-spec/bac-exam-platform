// src/app/(dashboard)/teacher/subjects/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { currentAcademicYear } from "@/lib/adminUsers";
import DashboardShell from "@/components/DashboardShell";
import SubjectsForm from "@/components/teacher/SubjectsForm";

export const dynamic = "force-dynamic";

export default async function TeacherSubjectsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const year = currentAcademicYear();

  const [gradeLevels, mySubjects] = await Promise.all([
    prisma.gradeLevel.findMany({
      orderBy: { orderNum: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        subjects: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, code: true, color: true },
        },
      },
    }),
    prisma.teacherSubject.findMany({
      where: { teacherId: session.sub, academicYear: year },
      select: { subjectId: true },
    }),
  ]);

  const selectedIds = mySubjects.map((s) => s.subjectId);

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/teacher" className="text-sm text-primary hover:underline">
          ← الرئيسية
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">موادّي الدراسية</h2>
        <p className="mt-1 text-sm text-ink/60">
          اختر المواد التي تدرّسها للعام الدراسي {year}. يمكنك تعديل الاختيار
          في أي وقت.
        </p>
      </div>
      <SubjectsForm gradeLevels={gradeLevels} initialSelected={selectedIds} />
    </DashboardShell>
  );
}
