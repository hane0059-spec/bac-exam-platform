// src/app/(dashboard)/teacher/quizzes/[id]/assign/page.tsx
// إسناد اختبار لطلاب المدرّس المسجّلين في مادته.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/gender";
import { parseSettings } from "@/lib/exam";
import DashboardShell from "@/components/DashboardShell";
import AssignPanel, {
  type AssignStudent,
} from "@/components/teacher/AssignPanel";
import ExternalImport from "@/components/admin/ExternalImport";

export const dynamic = "force-dynamic";

export default async function AssignQuizPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const quiz = await prisma.quiz.findUnique({ where: { id: params.id } });
  if (!quiz || quiz.creatorId !== session.sub) notFound();

  // طلاب مسجّلون مع المدرّس في مادة الاختبار.
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { teacherId: session.sub, subjectId: quiz.subjectId, isActive: true },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gender: true,
          studentProfile: { select: { studentCode: true } },
        },
      },
    },
  });

  const studentIds = enrollments.map((e) => e.studentId);
  const [assignments, sessions] = await Promise.all([
    prisma.quizAssignment.findMany({
      where: { quizId: quiz.id, studentId: { in: studentIds } },
      select: { studentId: true, dueDate: true, extraAttempts: true },
    }),
    prisma.examSession.findMany({
      where: { quizId: quiz.id, studentId: { in: studentIds } },
      select: { studentId: true, status: true, percentage: true },
    }),
  ]);

  const maxAttempts = parseSettings(quiz.settings).maxAttempts;
  const dueByStudent = new Map(
    assignments.map((a) => [a.studentId, a.dueDate])
  );
  const extraByStudent = new Map(
    assignments.map((a) => [a.studentId, a.extraAttempts])
  );
  const assignedSet = new Set(assignments.map((a) => a.studentId));

  function finishedCount(sid: string): number {
    return sessions.filter(
      (s) =>
        s.studentId === sid &&
        (s.status === "COMPLETED" || s.status === "TIMED_OUT")
    ).length;
  }
  function statusLabel(sid: string): string | null {
    const mine = sessions.filter((s) => s.studentId === sid);
    if (mine.some((s) => s.status === "IN_PROGRESS")) return "قيد الأداء";
    const done = mine.filter(
      (s) => s.status === "COMPLETED" || s.status === "TIMED_OUT"
    );
    if (done.length === 0) return null;
    const best = Math.max(...done.map((s) => Number(s.percentage)));
    return `أدّى — أفضل نتيجة ${best}%`;
  }

  const students: AssignStudent[] = enrollments
    .filter((e) => e.student)
    .map((e) => {
      const st = e.student!;
      return {
        id: st.id,
        name: `${st.firstName} ${st.lastName}`,
        studentCode: st.studentProfile?.studentCode ?? "—",
        genderLabel: roleLabel("STUDENT", st.gender),
        assigned: assignedSet.has(st.id),
        dueDate: dueByStudent.get(st.id)?.toISOString() ?? null,
        statusLabel: statusLabel(st.id),
        attemptsUsed: finishedCount(st.id),
        effectiveMax: maxAttempts + (extraByStudent.get(st.id) ?? 0),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  const gradeLevels = await prisma.gradeLevel.findMany({
    select: { id: true, name: true },
    orderBy: { orderNum: "asc" },
  });

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href={`/teacher/quizzes/${quiz.id}/edit`}
          className="text-sm text-primary hover:underline"
        >
          ← تكوين الاختبار
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">
          إسناد: {quiz.title}
        </h2>
      </div>
      <AssignPanel
        quizId={quiz.id}
        published={quiz.status === "PUBLISHED"}
        students={students}
      />

      <div className="mt-8">
        <h3 className="mb-2 font-display text-lg font-bold">
          إسناد خارجي (من ملف)
        </h3>
        <p className="mb-3 text-sm text-ink/60">
          استورد قائمة طلاب من ملف (CSV/Excel) وأسنِد لهم هذا الاختبار مباشرةً —
          تُنشأ حساباتهم وتُوزَّع بياناتهم. يتطلّب أن يكون الاختبار منشوراً.
        </p>
        <ExternalImport
          grades={gradeLevels}
          endpoint={`/api/teacher/quizzes/${quiz.id}/external-import`}
        />
      </div>
    </DashboardShell>
  );
}
