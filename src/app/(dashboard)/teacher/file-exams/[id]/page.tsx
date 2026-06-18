// src/app/(dashboard)/teacher/file-exams/[id]/page.tsx
// المدرّس: إدارة اختبار ورقي (ملكية المُنشئ فقط).
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import FileExamManager from "@/components/teacher/FileExamManager";
import { parseFileExamSettings } from "@/lib/fileExam";

export const dynamic = "force-dynamic";

export default async function FileExamManagePage({
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
      description: true,
      status: true,
      accessCode: true,
      settings: true,
      availableFrom: true,
      availableUntil: true,
      attachments: {
        where: { kind: "EXAM_FILE" },
        select: { id: true, mimeType: true },
        take: 1,
      },
    },
  });
  if (!quiz || quiz.creatorId !== session.sub || !quiz.isFileBased) notFound();

  const s = parseFileExamSettings(quiz.settings);

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/teacher/quizzes" className="text-sm text-primary hover:underline">
          ← اختباراتي
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">
          اختبار ورقي: {quiz.title}
        </h2>
      </div>
      <FileExamManager
        quizId={quiz.id}
        status={quiz.status as "DRAFT" | "PUBLISHED" | "ARCHIVED"}
        accessCode={quiz.accessCode}
        examFile={quiz.attachments[0] ?? null}
        initial={{
          title: quiz.title,
          description: quiz.description ?? "",
          maxScore: s.maxScore,
          minutes: s.timeLimitSec ? String(Math.round(s.timeLimitSec / 60)) : "",
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
