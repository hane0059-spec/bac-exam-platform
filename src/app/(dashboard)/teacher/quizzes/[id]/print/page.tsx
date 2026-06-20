// src/app/(dashboard)/teacher/quizzes/[id]/print/page.tsx
// طباعة/تصدير الاختبار: ورقة أسئلة + سلّم تصحيح (ملكية المدرّس المُنشئ فقط).
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PrintableExam, {
  type PrintExamData,
} from "@/components/teacher/PrintableExam";
import { fillTemplateForDisplay, parseBlankAnswers } from "@/lib/grading";

export const dynamic = "force-dynamic";

export default async function PrintQuizPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const quiz = await prisma.quiz.findUnique({
    where: { id: params.id },
    select: {
      creatorId: true,
      title: true,
      description: true,
      subject: { select: { name: true } },
      nodes: {
        where: { nodeType: "QUESTION" },
        orderBy: { positionX: "asc" },
        select: {
          pointsOverride: true,
          question: {
            select: {
              content: true,
              type: true,
              points: true,
              explanation: true,
              acceptedAnswers: true,
              options: {
                orderBy: { orderNum: "asc" },
                select: { label: true, content: true, isCorrect: true },
              },
              matchingPairs: {
                orderBy: { orderNum: "asc" },
                select: { leftItem: true, rightItem: true },
              },
            },
          },
        },
      },
    },
  });
  if (!quiz || quiz.creatorId !== session.sub) notFound();

  let totalPoints = 0;
  const questions = quiz.nodes
    .filter((n) => n.question)
    .map((n, i) => {
      const q = n.question!;
      const points = Number(n.pointsOverride ?? q.points);
      totalPoints += points;
      const isFill = q.type === "FILL_BLANK";
      const isMatch = q.type === "MATCHING";
      const isCalc = q.type === "CALCULATION";
      return {
        index: i + 1,
        type: q.type,
        // ملء الفراغات: يُعرَض النصّ بخطوط بدل علامات [[ ]].
        content: isFill ? fillTemplateForDisplay(q.content) : q.content,
        points,
        // الفراغات/المطابقة تحمل الإجابات النموذجية — لا تُعرَض كخيارات في ورقة الأسئلة.
        options:
          isFill || isMatch
            ? []
            : q.options.map((o) => ({
                label: o.label,
                content: o.content,
                isCorrect: o.isCorrect,
              })),
        acceptedAnswers:
          q.type === "SHORT_ANSWER"
            ? q.acceptedAnswers
            : isFill
            ? q.options.map(
                (o, k) => `(${k + 1}) ${parseBlankAnswers(o.content).join(" / ")}`
              )
            : isMatch
            ? q.matchingPairs.map((p) => `${p.leftItem} ← ${p.rightItem}`)
            : isCalc
            ? [
                q.acceptedAnswers[1]
                  ? `${q.acceptedAnswers[0]} (± ${q.acceptedAnswers[1]})`
                  : q.acceptedAnswers[0] ?? "",
              ]
            : [],
        explanation: q.explanation ?? null,
      };
    });

  const data: PrintExamData = {
    title: quiz.title,
    description: quiz.description,
    subjectName: quiz.subject.name,
    questions,
    totalPoints,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/teacher/quizzes/${params.id}/edit`}
        className="mb-4 inline-block text-sm text-primary hover:underline print:hidden"
      >
        ← تكوين الاختبار
      </Link>
      {questions.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا أسئلة في هذا الاختبار بعد.
        </div>
      ) : (
        <PrintableExam data={data} />
      )}
    </main>
  );
}
