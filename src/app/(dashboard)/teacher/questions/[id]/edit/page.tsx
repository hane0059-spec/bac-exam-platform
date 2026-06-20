// src/app/(dashboard)/teacher/questions/[id]/edit/page.tsx
// تعديل سؤال قائم (ملكية المدرّس المُنشئ فقط).
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import QuestionForm, {
  type QuestionInitial,
} from "@/components/teacher/QuestionForm";
import { getTeacherSubjectTree } from "@/lib/teacher";

export const dynamic = "force-dynamic";

export default async function EditQuestionPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const q = await prisma.question.findUnique({
    where: { id: params.id },
    include: {
      options: { orderBy: { orderNum: "asc" } },
      matchingPairs: { orderBy: { orderNum: "asc" } },
      _count: { select: { studentAnswers: true } },
    },
  });
  if (!q || q.creatorId !== session.sub || !q.isActive) notFound();

  const subjects = await getTeacherSubjectTree(session.sub);

  const initial: QuestionInitial = {
    type: q.type as QuestionInitial["type"],
    subjectId: q.subjectId,
    chapterId: q.chapterId,
    conceptId: q.conceptId,
    content: q.content,
    difficulty: q.difficulty as QuestionInitial["difficulty"],
    points: Number(q.points),
    explanation: q.explanation ?? "",
    tags: q.tags,
    acceptedAnswers: q.acceptedAnswers,
    options: q.options.map((o) => ({
      content: o.content,
      isCorrect: o.isCorrect,
    })),
    matchingPairs: q.matchingPairs.map((p) => ({
      left: p.leftItem,
      right: p.rightItem,
    })),
    used: q._count.studentAnswers > 0,
  };

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href="/teacher/questions"
          className="text-sm text-primary hover:underline"
        >
          ← بنك الأسئلة
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">تعديل السؤال</h2>
      </div>
      <QuestionForm
        mode="edit"
        questionId={q.id}
        subjects={subjects}
        initial={initial}
      />
    </DashboardShell>
  );
}
