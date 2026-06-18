// src/app/(dashboard)/student/quizzes/[quizId]/page.tsx
// صفحة أداء اختبار: تتحقّق من الإسناد ثم تُحمّل المُشغّل المناسب (شجري أو ورقي).
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import QuizRunner from "@/components/student/QuizRunner";
import FileExamRunner from "@/components/student/FileExamRunner";
import { parseSettings, isWithinWindow } from "@/lib/exam";
import { parseFileExamSettings } from "@/lib/fileExam";

export const dynamic = "force-dynamic";

export default async function TakeQuizPage({
  params,
}: {
  params: { quizId: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "STUDENT") redirect("/");
  const studentId = session.sub;

  // الملكية: الاختبار مُسنَد لهذا الطالب ومنشور.
  const assignment = await prisma.quizAssignment.findFirst({
    where: {
      quizId: params.quizId,
      studentId,
      quiz: { status: "PUBLISHED" },
    },
    include: {
      quiz: {
        include: {
          nodes: { where: { nodeType: "QUESTION" }, select: { id: true } },
        },
      },
    },
  });
  if (!assignment) notFound();

  const quiz = assignment.quiz;

  if (!quiz.isFileBased) {
    const settings = parseSettings(quiz.settings);
    return (
      <DashboardShell session={session}>
        <div className="mb-6">
          <Link href="/student/quizzes" className="text-sm text-primary hover:underline">
            ← اختباراتي
          </Link>
        </div>
        <QuizRunner
          quizId={quiz.id}
          title={quiz.title}
          description={quiz.description}
          questionCount={quiz.nodes.length}
          timeLimitSec={settings.timeLimitSec}
          gender={session.gender}
        />
      </DashboardShell>
    );
  }

  // ─── اختبار ورقي/مرفوع ───
  const settings = parseFileExamSettings(quiz.settings);
  const [examFile, inProgress, finished, finishedCount] = await Promise.all([
    prisma.attachment.findFirst({
      where: { quizId: quiz.id, kind: "EXAM_FILE" },
      select: { id: true, mimeType: true },
    }),
    prisma.examSession.findFirst({
      where: { studentId, quizId: quiz.id, status: "IN_PROGRESS" },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        attachments: {
          where: { kind: "ANSWER_UPLOAD" },
          orderBy: { createdAt: "asc" },
          select: { id: true, mimeType: true },
        },
      },
    }),
    prisma.examSession.findFirst({
      where: {
        studentId,
        quizId: quiz.id,
        status: { in: ["COMPLETED", "TIMED_OUT"] },
      },
      orderBy: { completedAt: "desc" },
      select: {
        needsGrading: true,
        totalScore: true,
        maxPossibleScore: true,
        percentage: true,
        teacherFeedback: true,
        attachments: {
          where: { kind: "ANSWER_UPLOAD" },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            mimeType: true,
            annotations: {
              orderBy: { createdAt: "asc" },
              select: { id: true, x: true, y: true, text: true },
            },
          },
        },
      },
    }),
    prisma.examSession.count({
      where: {
        studentId,
        quizId: quiz.id,
        status: { in: ["COMPLETED", "TIMED_OUT"] },
      },
    }),
  ]);

  const open = isWithinWindow(quiz.availableFrom, quiz.availableUntil);
  const maxAttempts = settings.maxAttempts + assignment.extraAttempts;
  const canStart = open && !inProgress && finishedCount < maxAttempts;

  let view: "locked" | "not_started" | "in_progress" | "submitted" | "graded";
  if (inProgress) view = "in_progress";
  else if (finished)
    view = finished.needsGrading ? "submitted" : "graded";
  else view = canStart ? "not_started" : "locked";

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/student/quizzes" className="text-sm text-primary hover:underline">
          ← اختباراتي
        </Link>
      </div>
      <FileExamRunner
        quizId={quiz.id}
        title={quiz.title}
        description={quiz.description}
        examFileId={examFile?.id ?? null}
        view={view}
        canStart={canStart}
        sessionId={inProgress?.id ?? null}
        inProgressUploads={inProgress?.attachments ?? []}
        finished={
          finished
            ? {
                needsGrading: finished.needsGrading,
                score: Number(finished.totalScore),
                max: Number(finished.maxPossibleScore),
                percentage: Number(finished.percentage),
                feedback: finished.teacherFeedback,
                uploads: finished.attachments,
              }
            : null
        }
      />
    </DashboardShell>
  );
}
