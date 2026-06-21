// src/app/(dashboard)/teacher/keyboard/page.tsx
// المدرّس: بناء لوحة المعادلات المخصّصة من بنك الرموز (لكل مادة).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell from "@/components/DashboardShell";
import KeyboardBuilder from "@/components/teacher/KeyboardBuilder";
import { getTeacherKeyboard } from "@/lib/teacherKeyboard";

export const dynamic = "force-dynamic";

export default async function TeacherKeyboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const keyboard = await getTeacherKeyboard(session.sub);

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/teacher" className="text-sm text-primary hover:underline">
          ← الرئيسية
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">لوحة المعادلات</h2>
        <p className="mt-1 text-sm text-ink/60">
          اختر من بنك الرموز ما تستخدمه في كل مادة، فيظهر في تبويب «لوحتي» داخل
          محرّر المعادلات — عند تأليفك الأسئلة وعند إجابة طلابك. عُد للبنك متى
          احتجت رمزاً جديداً.
        </p>
      </div>
      <KeyboardBuilder initial={keyboard} />
    </DashboardShell>
  );
}
