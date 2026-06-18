// src/app/(dashboard)/admin/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin";
import DashboardShell, { PlaceholderCard } from "@/components/DashboardShell";

export default async function AdminDashboard() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  const session = ctx.session;

  return (
    <DashboardShell session={session}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ctx.isSuper && (
          <Link
            href="/admin/overview"
            className="card p-5 transition hover:border-primary/40"
          >
            <h3 className="mb-2 font-display text-lg font-semibold">
              نظرة عامة وإشراف
            </h3>
            <p className="text-sm leading-relaxed text-ink/60">
              إحصاءات المنصّة وتوزّعها على المؤسّسات.
            </p>
          </Link>
        )}
        {ctx.isSuper && (
          <Link
            href="/admin/schools"
            className="card p-5 transition hover:border-primary/40"
          >
            <h3 className="mb-2 font-display text-lg font-semibold">
              المدارس والمعاهد
            </h3>
            <p className="text-sm leading-relaxed text-ink/60">
              إنشاء المؤسّسات وتعيين مديريها.
            </p>
          </Link>
        )}
        <Link
          href="/admin/external"
          className="card p-5 transition hover:border-primary/40"
        >
          <h3 className="mb-2 font-display text-lg font-semibold">
            استيراد طلاب خارجيين
          </h3>
          <p className="text-sm leading-relaxed text-ink/60">
            استيراد قائمة طلاب من CSV/Excel وإسناد اختبار منشور لهم.
          </p>
        </Link>
        <Link
          href="/admin/users"
          className="card p-5 transition hover:border-primary/40"
        >
          <h3 className="mb-2 font-display text-lg font-semibold">المستخدمون</h3>
          <p className="text-sm leading-relaxed text-ink/60">
            إنشاء وإدارة حسابات المدراء والمدرّسين وربط المواد.
          </p>
        </Link>
        {ctx.isSuper && (
          <Link
            href="/admin/academics"
            className="card p-5 transition hover:border-primary/40"
          >
            <h3 className="mb-2 font-display text-lg font-semibold">
              المواد والصفوف
            </h3>
            <p className="text-sm leading-relaxed text-ink/60">
              إنشاء الصفوف والمواد (وربط المدرّسين من «المستخدمون»).
            </p>
          </Link>
        )}
        {ctx.isSuper && (
          <Link
            href="/admin/fields"
            className="card p-5 transition hover:border-primary/40"
          >
            <h3 className="mb-2 font-display text-lg font-semibold">
              الحقول المخصّصة
            </h3>
            <p className="text-sm leading-relaxed text-ink/60">
              تعريف حقول إضافية للمستخدمين (مدينة/مدرسة…) وضبط إجباريتها.
            </p>
          </Link>
        )}
        {ctx.isSuper ? (
          <Link
            href="/admin/questions"
            className="card p-5 transition hover:border-primary/40"
          >
            <h3 className="mb-2 font-display text-lg font-semibold">
              البنك العام للأسئلة
            </h3>
            <p className="text-sm leading-relaxed text-ink/60">
              تصفّح أسئلة كل المؤسّسات (قراءة فقط) بفلترة ومادة ونوع.
            </p>
          </Link>
        ) : (
          <PlaceholderCard
            title="البنك العام للأسئلة"
            description="الإشراف على بنك الأسئلة المشترك بين المدرّسين."
          />
        )}
        {ctx.isSuper && (
          <Link
            href="/admin/quizzes"
            className="card p-5 transition hover:border-primary/40"
          >
            <h3 className="mb-2 font-display text-lg font-semibold">
              الاختبارات عبر المؤسّسات
            </h3>
            <p className="text-sm leading-relaxed text-ink/60">
              تصفّح اختبارات كل المؤسّسات (قراءة فقط) بفلترة وحالة.
            </p>
          </Link>
        )}
        <PlaceholderCard
          title="الإعدادات"
          description="ضبط الخط والثيم وإعدادات المنصة العامة."
        />
      </div>
    </DashboardShell>
  );
}
