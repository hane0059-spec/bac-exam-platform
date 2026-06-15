// src/app/(dashboard)/teacher/quizzes/new/page.tsx
// إنشاء اختبار جديد.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import NewQuizForm from "@/components/teacher/NewQuizForm";

export const dynamic = "force-dynamic";

export default async function NewQuizPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const subjects = await prisma.subject.findMany({
    where: { teacherSubjects: { some: { teacherId: session.sub } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href="/teacher/quizzes"
          className="text-sm text-primary hover:underline"
        >
          ← اختباراتي
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">اختبار جديد</h2>
      </div>
      {subjects.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا توجد مواد مسنَدة إليك بعد.
        </div>
      ) : (
        <NewQuizForm subjects={subjects} />
      )}
    </DashboardShell>
  );
}
