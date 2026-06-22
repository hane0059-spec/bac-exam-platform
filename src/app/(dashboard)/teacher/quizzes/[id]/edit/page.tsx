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
import { getTeacherSubjectTree } from "@/lib/teacher";
import { getTeacherKeyboard } from "@/lib/teacherKeyboard";

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

  const nodeQuestionIds = quiz.nodes
    .map((n) => n.questionId)
    .filter((id): id is string => !!id);

  // البنك للاختيار = أسئلة المادة في البنك (inBank=true)، مع تضمين أسئلة هذا
  // الاختبار حتّى الفوريّة (خارج البنك) كي تُعرَض عناصره.
  const bank = await prisma.question.findMany({
    where: {
      creatorId: session.sub,
      subjectId: quiz.subjectId,
      isActive: true,
      OR: [{ inBank: true }, { id: { in: nodeQuestionIds } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      type: true,
      points: true,
      difficulty: true,
      inBank: true,
      chapterId: true,
      chapter: { select: { title: true } },
    },
  });

  // شجرة مادة الاختبار (للتأليف الفوريّ) + لوحة المدرّس المخصّصة.
  const subjectTree = (await getTeacherSubjectTree(session.sub)).filter(
    (s) => s.id === quiz.subjectId
  );
  const customKeyboard = await getTeacherKeyboard(session.sub);

  const settings = parseSettings(quiz.settings);
  const structural = await canEditStructure(quiz.id, quiz.status);
  // اختبار حُذف محتواه (تبقى درجاته فقط).
  const purged =
    quiz.settings && typeof quiz.settings === "object"
      ? (quiz.settings as Record<string, unknown>).purged === true
      : false;

  const initialItems = quiz.nodes
    .filter((n) => n.questionId)
    .map((n) => ({
      questionId: n.questionId as string,
      pointsOverride: n.pointsOverride ? Number(n.pointsOverride) : null,
    }));

  // شارة الحالة (متّسقة مع قائمة الاختبارات).
  const STATUS_CHIP = {
    DRAFT: { text: "مسوّدة", cls: "bg-ink/10 text-ink/60" },
    PUBLISHED: { text: "منشور", cls: "bg-primary text-white" },
    ARCHIVED: { text: "مؤرشف", cls: "bg-gold/15 text-gold" },
  } as const;
  const chip = STATUS_CHIP[quiz.status as keyof typeof STATUS_CHIP];

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href="/teacher/quizzes"
          className="text-sm text-primary hover:underline"
        >
          ← اختباراتي
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-bold">تكوين الاختبار</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${chip.cls}`}
            >
              {chip.text}
            </span>
            {purged && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                محتوى محذوف
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/teacher/quizzes/${quiz.id}/print`}
              className="rounded-xl border border-line px-4 py-2 text-sm font-medium hover:bg-ink/5"
            >
              تصدير PDF (ورقي)
            </Link>
            {quiz.status === "PUBLISHED" && (
              <Link
                href={`/teacher/quizzes/${quiz.id}/assign`}
                className="btn-primary"
              >
                إسناد للطلاب ←
              </Link>
            )}
          </div>
        </div>
        {quiz.status === "PUBLISHED" && quiz.accessCode && (
          <p className="mt-2 inline-block rounded-xl bg-primary-light px-3 py-1.5 text-sm text-primary-dark">
            رمز الاختبار للدخول:{" "}
            <span className="font-bold" dir="ltr">
              {quiz.accessCode}
            </span>{" "}
            — يدخله الطالب في «اختباراتي» للانضمام.
          </p>
        )}
      </div>
      <QuizBuilder
        quizId={quiz.id}
        status={quiz.status as "DRAFT" | "PUBLISHED" | "ARCHIVED"}
        purged={purged}
        canEditStructure={structural}
        bank={bank.map((q) => ({
          id: q.id,
          content: q.content,
          type: q.type as QType,
          points: Number(q.points),
          difficulty: q.difficulty,
          inBank: q.inBank,
          chapterId: q.chapterId,
          chapterTitle: q.chapter?.title ?? null,
        }))}
        subjectTree={subjectTree}
        customKeyboard={customKeyboard}
        initialItems={initialItems}
        initial={{
          title: quiz.title,
          description: quiz.description ?? "",
          timeLimitSec: settings.timeLimitSec,
          maxAttempts: settings.maxAttempts,
          revealAnswers: settings.revealAnswers,
          shuffle: settings.shuffle,
          availableFrom: quiz.availableFrom
            ? quiz.availableFrom.toISOString()
            : null,
          availableUntil: quiz.availableUntil
            ? quiz.availableUntil.toISOString()
            : null,
          accessCode: quiz.accessCode,
          allowCodeJoin: quiz.allowCodeJoin,
        }}
      />
    </DashboardShell>
  );
}
