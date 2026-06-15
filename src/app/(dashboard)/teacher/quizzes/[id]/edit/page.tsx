// src/app/(dashboard)/teacher/quizzes/[id]/edit/page.tsx
// باني/محرّر اختبار (ملكية المدرّس المُنشئ فقط).
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import QuizBuilder from "@/components/teacher/QuizBuilder";
import { parseSettings } from "@/lib/exam";
import { canEditStructure } from "@/lib/teacherQuiz";

export const dynamic = "force-dynamic";

type QType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";

export default async function EditQuizPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    include: {
      nodes: {
        where: { nodeType: "QUESTION" },
        orderBy: { positionX: "asc" },
        select: { questionId: true, pointsOverride: true },
      },
    },
  });
  if (!quiz || quiz.creatorId !== session.sub) notFound();

  const bank = await prisma.question.findMany({
    where: {
      creatorId: session.sub,
      subjectId: quiz.subjectId,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      type: true,
      points: true,
      difficulty: true,
    },
  });

  const settings = parseSettings(quiz.settings);
  const structural = await canEditStructure(quiz.id, quiz.status);

  const initialItems = quiz.nodes
    .filter((n) => n.questionId)
    .map((n) => ({
      questionId: n.questionId as string,
      pointsOverride: n.pointsOverride ? Number(n.pointsOverride) : null,
    }));

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href="/teacher/quizzes"
          className="text-sm text-primary hover:underline"
        >
          ← اختباراتي
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">تكوين الاختبار</h2>
      </div>
      <QuizBuilder
        quizId={quiz.id}
        status={quiz.status as "DRAFT" | "PUBLISHED" | "ARCHIVED"}
        canEditStructure={structural}
        bank={bank.map((q) => ({
          id: q.id,
          content: q.content,
          type: q.type as QType,
          points: Number(q.points),
          difficulty: q.difficulty,
        }))}
        initialItems={initialItems}
        initial={{
          title: quiz.title,
          description: quiz.description ?? "",
          timeLimitSec: settings.timeLimitSec,
          maxAttempts: settings.maxAttempts,
          revealAnswers: settings.revealAnswers,
          availableFrom: quiz.availableFrom
            ? quiz.availableFrom.toISOString()
            : null,
          availableUntil: quiz.availableUntil
            ? quiz.availableUntil.toISOString()
            : null,
        }}
      />
    </DashboardShell>
  );
}
