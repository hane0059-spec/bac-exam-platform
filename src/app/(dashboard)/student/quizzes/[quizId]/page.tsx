// src/app/(dashboard)/student/quizzes/[quizId]/page.tsx
// صفحة أداء اختبار: تتحقّق من الإسناد ثم تُحمّل مُشغّل العميل.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import QuizRunner from "@/components/student/QuizRunner";
import { parseSettings } from "@/lib/exam";

export const dynamic = "force-dynamic";

export default async function TakeQuizPage({
  params,
}: {
  params: { quizId: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "STUDENT") redirect("/");

  // الملكية: الاختبار مُسنَد لهذا الطالب ومنشور.
  const assignment = await prisma.quizAssignment.findFirst({
    where: {
      quizId: params.quizId,
      studentId: session.sub,
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
  const settings = parseSettings(quiz.settings);

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href="/student/quizzes"
          className="text-sm text-primary hover:underline"
        >
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
