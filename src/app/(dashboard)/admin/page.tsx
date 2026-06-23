// src/app/(dashboard)/admin/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import UserSearchBox from "@/components/admin/UserSearchBox";
import { isSoloMode } from "@/lib/settings";

export default async function AdminDashboard() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  const session = ctx.session;
  const solo = await isSoloMode();

  return (
    <DashboardShell session={session}>
      <UserSearchBox initial="" />

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
        {ctx.isSuper && !solo && (
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
        {!solo && (
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
        )}
        <Link
          href="/admin/users"
          className="card p-5 transition hover:border-primary/40"
        >
          <h3 className="mb-2 font-display text-lg font-semibold">المستخدمون</h3>
          <p className="text-sm leading-relaxed text-ink/60">
            {solo
              ? "إنشاء وإدارة المدرّسين المستقلّين وحدّ طلاب كلٍّ منهم."
              : "إنشاء وإدارة حسابات المدراء والمدرّسين وربط المواد."}
          </p>
        </Link>
        {!solo && (
          <Link
            href="/admin/parents"
            className="card p-5 transition hover:border-primary/40"
          >
            <h3 className="mb-2 font-display text-lg font-semibold">
              أولياء الأمور
            </h3>
            <p className="text-sm leading-relaxed text-ink/60">
              إنشاء أولياء الأمور وربطهم بأبنائهم لمتابعة نتائجهم.
            </p>
          </Link>
        )}
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
        {ctx.isSuper && !solo && (
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
        {ctx.isSuper && (
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
        {ctx.isSuper && (
          <Link
            href="/admin/storage"
            className="card p-5 transition hover:border-primary/40"
          >
            <h3 className="mb-2 font-display text-lg font-semibold">
              التخزين والمرفقات
            </h3>
            <p className="text-sm leading-relaxed text-ink/60">
              مراقبة حجم المرفقات (صور/PDF) وتوزّعها على المؤسّسات.
            </p>
          </Link>
        )}
        {ctx.isSuper && (
          <Link
            href="/admin/settings"
            className="card p-5 transition hover:border-primary/40"
          >
            <h3 className="mb-2 font-display text-lg font-semibold">الإعدادات</h3>
            <p className="text-sm leading-relaxed text-ink/60">
              اختيار خطّ المنصّة المطبَّق على كل الواجهات.
            </p>
          </Link>
        )}
      </div>
    </DashboardShell>
  );
}
