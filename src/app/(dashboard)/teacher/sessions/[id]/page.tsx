// src/app/(dashboard)/teacher/sessions/[id]/page.tsx
// مراجعة المدرّس لجلسة طالب على أحد اختباراته.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSessionReview } from "@/lib/exam";
import DashboardShell from "@/components/DashboardShell";
import SessionReviewView from "@/components/SessionReviewView";

export const dynamic = "force-dynamic";

export default async function TeacherSessionReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  // الملكية: الجلسة على اختبار يملكه هذا المدرّس.
  const exam = await prisma.examSession.findUnique({
    where: { id: params.id },
    select: { quizId: true, quiz: { select: { creatorId: true } } },
  });
  if (!exam || exam.quiz.creatorId !== session.sub) notFound();

  const review = await getSessionReview(params.id);
  if (!review) notFound();

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href={`/teacher/quizzes/${exam.quizId}/results`}
          className="text-sm text-primary hover:underline"
        >
          ← نتائج الاختبار
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">
          مراجعة: {review.studentName}
        </h2>
      </div>
      <SessionReviewView review={review} />
    </DashboardShell>
  );
}
