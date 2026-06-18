// src/app/(dashboard)/teacher/file-exams/[id]/submissions/page.tsx
// المدرّس: إجابات الطلاب على اختبار ورقي + تصحيحها. ملكية المُنشئ فقط.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import FileGradePanel from "@/components/teacher/FileGradePanel";
import { parseFileExamSettings } from "@/lib/fileExam";

export const dynamic = "force-dynamic";

export default async function FileExamSubmissionsPage({
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
      id: true,
      creatorId: true,
      isFileBased: true,
      title: true,
      settings: true,
    },
  });
  if (!quiz || quiz.creatorId !== session.sub || !quiz.isFileBased) notFound();

  const max = parseFileExamSettings(quiz.settings).maxScore;

  // المحاولات المُرسَلة (مكتملة) فقط — الجارية لم تُرسل بعد.
  const sessions = await prisma.examSession.findMany({
    where: { quizId: quiz.id, status: "COMPLETED" },
    orderBy: [{ needsGrading: "desc" }, { completedAt: "desc" }],
    select: {
      id: true,
      needsGrading: true,
      totalScore: true,
      teacherFeedback: true,
      student: { select: { firstName: true, lastName: true } },
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

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href={`/teacher/file-exams/${quiz.id}`}
          className="text-sm text-primary hover:underline"
        >
          ← إدارة الاختبار
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">
          الإجابات والتصحيح: {quiz.title}
        </h2>
        <p className="mt-1 text-sm text-ink/60">{sessions.length} محاولة مُرسَلة</p>
      </div>

      {sessions.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا إجابات مُرسَلة بعد.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <FileGradePanel
              key={s.id}
              sessionId={s.id}
              studentName={`${s.student.firstName} ${s.student.lastName}`}
              max={max}
              uploads={s.attachments}
              initialScore={s.needsGrading ? null : Number(s.totalScore)}
              initialFeedback={s.teacherFeedback ?? ""}
              needsGrading={s.needsGrading}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
