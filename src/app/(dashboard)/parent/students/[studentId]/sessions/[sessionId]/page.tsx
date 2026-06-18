// src/app/(dashboard)/parent/students/[studentId]/sessions/[sessionId]/page.tsx
// لوحة ولي الأمر: مراجعة جلسة ابن واحدة (قراءة فقط) — مع فحص ملكية مزدوج.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getParentSession, parentOwnsStudent } from "@/lib/parent";
import { getSessionReview } from "@/lib/exam";
import DashboardShell from "@/components/DashboardShell";
import SessionReviewView from "@/components/SessionReviewView";

export const dynamic = "force-dynamic";

export default async function ChildSessionReviewPage({
  params,
}: {
  params: { studentId: string; sessionId: string };
}) {
  const session = await getParentSession();
  if (!session) redirect("/login");

  // فحص ملكية مزدوج: الوليّ مرتبط بالطالب، والجلسة لهذا الطالب.
  if (!(await parentOwnsStudent(session.sub, params.studentId))) notFound();
  const exam = await prisma.examSession.findUnique({
    where: { id: params.sessionId },
    select: { studentId: true },
  });
  if (!exam || exam.studentId !== params.studentId) notFound();

  const review = await getSessionReview(params.sessionId);
  if (!review) notFound();

  // إخفاء النتيجة النهائية ما دامت هناك إجابات بانتظار التصحيح.
  const pending = review.items.some((it) => it.needsReview);

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href={`/parent/students/${params.studentId}`}
          className="text-sm text-primary hover:underline"
        >
          ← النتائج
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">
          {review.studentName}
        </h2>
      </div>

      {pending ? (
        <div className="card p-8 text-center text-ink/60">
          هذه المحاولة بانتظار تصحيح المدرّس — تظهر النتيجة بعد اكتماله.
        </div>
      ) : (
        <SessionReviewView review={review} />
      )}
    </DashboardShell>
  );
}
