// src/app/(dashboard)/teacher/file-exams/new/page.tsx
// المدرّس: إنشاء اختبار ورقي/مرفوع جديد.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import FileExamForm from "@/components/teacher/FileExamForm";
import { teacherCanFileExams } from "@/lib/teacher";

export const dynamic = "force-dynamic";

export default async function NewFileExamPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");
  // الخاصّية يفعّلها المدير؛ المنع على الخادم لا الواجهة فقط.
  if (!(await teacherCanFileExams(session.sub))) redirect("/teacher/quizzes");

  const subjects = await prisma.subject.findMany({
    where: { teacherSubjects: { some: { teacherId: session.sub } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/teacher/quizzes" className="text-sm text-primary hover:underline">
          ← اختباراتي
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">اختبار ورقي جديد</h2>
        <p className="mt-1 text-sm text-ink/60">
          ارفع الاختبار كصورة/PDF، ويرفع الطالب صورة إجابته ليُصحّحها المدرّس.
        </p>
      </div>
      <FileExamForm subjects={subjects} />
    </DashboardShell>
  );
}
