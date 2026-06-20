// src/app/(dashboard)/teacher/students/[id]/page.tsx
// صفحة الطالب لدى المدرّس: معلومات + إسناد اختبار من اختباراته. متاحة لأي مدرّس
// على طلابه (إنشاءً أو تسجيلاً)، بلا اشتراط canManageStudents — الإسناد حرّ دائماً.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/gender";
import { teacherCanManageStudents } from "@/lib/teacher";
import DashboardShell from "@/components/DashboardShell";
import StudentAssignQuiz, {
  type AssignableQuiz,
  type AssignedQuiz,
} from "@/components/teacher/StudentAssignQuiz";

export const dynamic = "force-dynamic";

const SESSION_STATUS: Record<string, string> = {
  IN_PROGRESS: "قيد الأداء",
  COMPLETED: "مكتمل",
  TIMED_OUT: "انتهى الوقت",
  ABANDONED: "متروك",
};

export default async function TeacherStudentPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const student = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      studentProfile: { include: { gradeLevel: { select: { name: true } } } },
      studentEnrollments: {
        where: { teacherId: session.sub, isActive: true },
        select: { subjectId: true, subject: { select: { name: true } } },
      },
    },
  });
  // الملكية: طالبٌ من إنشاء المدرّس أو مسجّل معه.
  const isMine =
    student?.role === "STUDENT" &&
    (student.createdById === session.sub ||
      student.studentEnrollments.length > 0);
  if (!student || !isMine) notFound();

  const canManage = await teacherCanManageStudents(session.sub);
  const studentName = `${student.firstName} ${student.lastName}`;
  const eligibleSubjectIds = student.studentEnrollments.map((e) => e.subjectId);

  // اختبارات المدرّس المنشورة في مواد الطالب المسجّلة معه.
  const publishedQuizzes = eligibleSubjectIds.length
    ? await prisma.quiz.findMany({
        where: {
          creatorId: session.sub,
          status: "PUBLISHED",
          subjectId: { in: eligibleSubjectIds },
        },
        select: { id: true, title: true, subject: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  // إسنادات هذا الطالب على اختبارات المدرّس + حالة أدائه فيها.
  const assignments = await prisma.quizAssignment.findMany({
    where: { studentId: student.id, quiz: { creatorId: session.sub } },
    include: {
      quiz: {
        select: { id: true, title: true, subject: { select: { name: true } } },
      },
    },
    orderBy: { assignedAt: "desc" },
  });
  const assignedQuizIds = new Set(assignments.map((a) => a.quizId));

  const sessions = await prisma.examSession.findMany({
    where: {
      studentId: student.id,
      quizId: { in: assignments.map((a) => a.quizId) },
    },
    select: { quizId: true, status: true },
    orderBy: { startedAt: "desc" },
  });
  const statusByQuiz = new Map<string, string>();
  const inProgressQuiz = new Set<string>();
  for (const s of sessions) {
    if (!statusByQuiz.has(s.quizId))
      statusByQuiz.set(s.quizId, SESSION_STATUS[s.status] ?? s.status);
    if (s.status === "IN_PROGRESS") inProgressQuiz.add(s.quizId);
  }

  const assignable: AssignableQuiz[] = publishedQuizzes
    .filter((q) => !assignedQuizIds.has(q.id))
    .map((q) => ({ id: q.id, title: q.title, subjectName: q.subject.name }));

  const assigned: AssignedQuiz[] = assignments.map((a) => ({
    id: a.quiz.id,
    title: a.quiz.title,
    subjectName: a.quiz.subject.name,
    dueDate: a.dueDate ? a.dueDate.toISOString() : null,
    statusLabel: statusByQuiz.get(a.quizId) ?? null,
    inProgress: inProgressQuiz.has(a.quizId),
  }));

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href="/teacher/students"
          className="text-sm text-primary hover:underline"
        >
          ← طلابي
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">{studentName}</h2>
            <p className="mt-1 text-sm text-ink/60">
              {roleLabel("STUDENT", student.gender as "MALE" | "FEMALE")}
              {student.studentProfile?.studentCode &&
                ` • ${student.studentProfile.studentCode}`}
              {student.studentProfile?.gradeLevel?.name &&
                ` • ${student.studentProfile.gradeLevel.name}`}
            </p>
            {student.studentEnrollments.length > 0 && (
              <p className="mt-0.5 text-xs text-ink/40">
                مسجّل معك في:{" "}
                {student.studentEnrollments
                  .map((e) => e.subject.name)
                  .join("، ")}
              </p>
            )}
          </div>
          {canManage && (
            <Link
              href={`/teacher/students/${student.id}/edit`}
              className="rounded-xl border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary-light"
            >
              تعديل البيانات
            </Link>
          )}
        </div>
      </div>

      <StudentAssignQuiz
        studentId={student.id}
        studentName={studentName}
        assignable={assignable}
        assigned={assigned}
      />
    </DashboardShell>
  );
}
