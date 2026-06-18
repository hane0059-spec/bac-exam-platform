// src/app/(dashboard)/parent/students/[studentId]/sessions/[sessionId]/page.tsx
// لوحة ولي الأمر: مراجعة جلسة ابن واحدة (قراءة فقط) — مع فحص ملكية مزدوج.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getParentSession, parentOwnsStudent } from "@/lib/parent";
import { getSessionReview } from "@/lib/exam";
import DashboardShell from "@/components/DashboardShell";
import SessionReviewView from "@/components/SessionReviewView";
import ImageAnnotator from "@/components/ImageAnnotator";

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
    select: {
      studentId: true,
      needsGrading: true,
      totalScore: true,
      maxPossibleScore: true,
      percentage: true,
      teacherFeedback: true,
      student: { select: { firstName: true, lastName: true } },
      quiz: { select: { title: true, isFileBased: true } },
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
  });
  if (!exam || exam.studentId !== params.studentId) notFound();

  const studentName = `${exam.student.firstName} ${exam.student.lastName}`;

  const back = (
    <div className="mb-6">
      <Link
        href={`/parent/students/${params.studentId}`}
        className="text-sm text-primary hover:underline"
      >
        ← النتائج
      </Link>
      <h2 className="mt-2 font-display text-xl font-bold">{studentName}</h2>
    </div>
  );

  // ─── اختبار ورقي/مرفوع ───
  if (exam.quiz.isFileBased) {
    return (
      <DashboardShell session={session}>
        {back}
        {exam.needsGrading ? (
          <div className="card p-8 text-center text-ink/60">
            هذه المحاولة بانتظار تصحيح المدرّس.
          </div>
        ) : (
          <div className="card space-y-4 p-6">
            <p className="text-center text-ink/60">«{exam.quiz.title}»</p>
            <p
              className={`text-center font-display text-5xl font-bold ${
                Number(exam.percentage) >= 50
                  ? "text-primary-dark"
                  : "text-red-600"
              }`}
            >
              {Number(exam.percentage)}%
            </p>
            <p className="text-center text-sm text-ink/60">
              {Number(exam.totalScore)} من {Number(exam.maxPossibleScore)} نقطة
            </p>
            {exam.teacherFeedback && (
              <div className="rounded-xl bg-ink/5 p-3 text-sm leading-relaxed">
                <span className="font-medium">ملاحظة المدرّس: </span>
                {exam.teacherFeedback}
              </div>
            )}
            {exam.attachments.length > 0 && (
              <div className="space-y-4">
                {exam.attachments.map((u) => (
                  <ImageAnnotator
                    key={u.id}
                    attachmentId={u.id}
                    mimeType={u.mimeType}
                    annotations={u.annotations}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </DashboardShell>
    );
  }

  // ─── اختبار شجري ───
  const review = await getSessionReview(params.sessionId);
  if (!review) notFound();
  const pending = review.items.some((it) => it.needsReview);

  return (
    <DashboardShell session={session}>
      {back}
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
