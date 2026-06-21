// src/app/(dashboard)/teacher/questions/new/page.tsx
// إنشاء سؤال جديد.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell from "@/components/DashboardShell";
import QuestionForm from "@/components/teacher/QuestionForm";
import { getTeacherSubjectTree } from "@/lib/teacher";
import { getTeacherKeyboard } from "@/lib/teacherKeyboard";

export const dynamic = "force-dynamic";

export default async function NewQuestionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const subjects = await getTeacherSubjectTree(session.sub);
  const customKeyboard = await getTeacherKeyboard(session.sub);

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href="/teacher/questions"
          className="text-sm text-primary hover:underline"
        >
          ← بنك الأسئلة
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">سؤال جديد</h2>
      </div>

      {subjects.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا توجد مواد مسنَدة إليك بعد. تواصل مع المدير لإسناد مادة.
        </div>
      ) : (
        <QuestionForm
          mode="create"
          subjects={subjects}
          customKeyboard={customKeyboard}
        />
      )}
    </DashboardShell>
  );
}
