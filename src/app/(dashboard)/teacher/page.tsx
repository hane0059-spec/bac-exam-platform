// src/app/(dashboard)/teacher/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell, { PlaceholderCard } from "@/components/DashboardShell";
import UserSearchBox from "@/components/admin/UserSearchBox";

export const dynamic = "force-dynamic";

export default async function TeacherDashboard() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [openReports, openAppeals, needsGrading] = await Promise.all([
    prisma.questionReport.count({
      where: { status: "OPEN", question: { creatorId: session.sub } },
    }),
    prisma.gradeAppeal.count({
      where: { status: "OPEN", session: { quiz: { creatorId: session.sub } } },
    }),
    // بانتظار تصحيح يدويّ: ورقيّ (needsGrading) أو عاديّ فيه إجابة بانتظار المراجعة.
    prisma.examSession.count({
      where: {
        quiz: { creatorId: session.sub },
        OR: [
          { needsGrading: true },
          { answers: { some: { needsReview: true } } },
        ],
      },
    }),
  ]);

  return (
    <DashboardShell session={session}>
      <UserSearchBox
        initial=""
        basePath="/teacher/students"
        placeholder="ابحث في طلابك بالاسم أو الرمز أو البريد أو الهاتف"
      />

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
          href="/teacher/keyboard"
          className="card p-5 transition hover:border-primary/40"
        >
          <h3 className="mb-2 font-display text-lg font-semibold">
            لوحة المعادلات
          </h3>
          <p className="text-sm leading-relaxed text-ink/60">
            اختر رموز كل مادة من بنك الرموز لتظهر في «لوحتي» عند تأليف المعادلات.
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
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">
              المتابعة والنتائج
            </h3>
            {needsGrading > 0 && (
              <span className="flex h-6 items-center justify-center gap-1 rounded-full bg-gold px-2 text-xs font-bold text-white">
                {needsGrading} بانتظار التصحيح
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-ink/60">
            مراجعة نتائج الطلاب ودرجاتهم وإجاباتهم.
          </p>
        </Link>
        <Link
          href="/teacher/reports"
          className="card p-5 transition hover:border-primary/40"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">بلاغات الأسئلة</h3>
            {openReports > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                {openReports}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-ink/60">
            مراجعة ملاحظات الطلاب عن أخطاء محتملة في أسئلتك.
          </p>
        </Link>
        <Link
          href="/teacher/appeals"
          className="card p-5 transition hover:border-primary/40"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">
              اعتراضات التصحيح
            </h3>
            {openAppeals > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                {openAppeals}
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-ink/60">
            اعتراضات الطلاب على نتائج التصحيح اليدوي — راجعها وأعد التصحيح.
          </p>
        </Link>
      </div>
    </DashboardShell>
  );
}
