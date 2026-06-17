// src/app/(dashboard)/teacher/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell, { PlaceholderCard } from "@/components/DashboardShell";

export default async function TeacherDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <DashboardShell session={session}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/teacher/questions"
          className="card p-5 transition hover:border-primary/40"
        >
          <h3 className="mb-2 font-display text-lg font-semibold">بنك الأسئلة</h3>
          <p className="text-sm leading-relaxed text-ink/60">
            إنشاء أسئلتك الخاصة وتصفيتها حسب المادة.
          </p>
        </Link>
        <Link
          href="/teacher/quizzes"
          className="card p-5 transition hover:border-primary/40"
        >
          <h3 className="mb-2 font-display text-lg font-semibold">
            تكوين الاختبارات
          </h3>
          <p className="text-sm leading-relaxed text-ink/60">
            بناء الاختبارات من بنك أسئلتك وضبط العلامات والنشر.
          </p>
        </Link>
        <PlaceholderCard
          title="الإسناد"
          description="إسناد الاختبارات المنشورة لطلابك."
        />
        <Link
          href="/teacher/students"
          className="card p-5 transition hover:border-primary/40"
        >
          <h3 className="mb-2 font-display text-lg font-semibold">طلابي</h3>
          <p className="text-sm leading-relaxed text-ink/60">
            إنشاء حسابات الطلاب وتسجيلهم في موادّك وإدارتهم.
          </p>
        </Link>
        <Link
          href="/teacher/results"
          className="card p-5 transition hover:border-primary/40"
        >
          <h3 className="mb-2 font-display text-lg font-semibold">
            المتابعة والنتائج
          </h3>
          <p className="text-sm leading-relaxed text-ink/60">
            مراجعة نتائج الطلاب ودرجاتهم وإجاباتهم.
          </p>
        </Link>
      </div>
    </DashboardShell>
  );
}
