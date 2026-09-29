// src/app/(dashboard)/admin/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import StatBar from "@/components/StatBar";
import IconBadge from "@/components/IconBadge";
import UserSearchBox from "@/components/admin/UserSearchBox";
import { isSoloMode } from "@/lib/settings";

export default async function AdminDashboard() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  const session = ctx.session;
  const solo = await isSoloMode();

  // عزل المؤسّسة: المدير العام يرى المنصّة كاملةً، ومدير المدرسة مؤسّسته فقط.
  const scope = ctx.isSuper ? {} : { schoolId: ctx.schoolId };
  const [students, teachers, parents, quizzes] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", ...scope } }),
    prisma.user.count({ where: { role: "TEACHER", ...scope } }),
    prisma.user.count({ where: { role: "PARENT", ...scope } }),
    prisma.quiz.count({
      where: ctx.isSuper ? {} : { creator: { schoolId: ctx.schoolId } },
    }),
  ]);

  return (
    <DashboardShell session={session}>
      <StatBar
        stats={
          solo
            ? [
                { label: "الطلاب", value: students, tone: "primary", icon: "users" },
                { label: "مدرّسون مستقلّون", value: teachers, icon: "cap" },
                { label: "اختبارات", value: quizzes, tone: "muted", icon: "book" },
              ]
            : [
                { label: "الطلاب", value: students, tone: "primary", icon: "users" },
                { label: "المدرّسون", value: teachers, icon: "cap" },
                { label: "أولياء الأمور", value: parents, icon: "family" },
                { label: "اختبارات", value: quizzes, tone: "muted", icon: "book" },
              ]
        }
      />
      <UserSearchBox initial="" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ctx.isSuper && (
          <Link
            href="/admin/activity"
            className="card-link p-5"
          >
            <IconBadge icon="clock" />
            <h3 className="mb-2 font-display text-lg font-semibold">
              النشاط الحالي
            </h3>
            <p className="text-sm leading-relaxed text-ink/60">
              من هو متصل الآن أو نشط خلال آخر 30 دقيقة على المنصّة.
            </p>
          </Link>
        )}
        {ctx.isSuper && (
          <Link
            href="/admin/overview"
            className="card-link p-5"
          >
            <IconBadge icon="chart" />
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
            className="card-link p-5"
          >
            <IconBadge icon="shield" />
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
            className="card-link p-5"
          >
            <IconBadge icon="upload" />
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
          className="card-link p-5"
        >
          <IconBadge icon="users" />
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
            className="card-link p-5"
          >
            <IconBadge icon="family" />
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
            className="card-link p-5"
          >
            <IconBadge icon="cap" />
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
            className="card-link p-5"
          >
            <IconBadge icon="layers" />
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
            className="card-link p-5"
          >
            <IconBadge icon="book" />
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
            className="card-link p-5"
          >
            <IconBadge icon="check" />
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
            className="card-link p-5"
          >
            <IconBadge icon="folder" />
            <h3 className="mb-2 font-display text-lg font-semibold">
              التخزين والمرفقات
            </h3>
            <p className="text-sm leading-relaxed text-ink/60">
              مراقبة حجم المرفقات (صور/PDF) وتوزّعها على المؤسّسات.
            </p>
          </Link>
        )}
        <Link
          href="/admin/retention"
          className="card-link p-5"
        >
          <IconBadge icon="alert" tone="gold" />
          <h3 className="mb-2 font-display text-lg font-semibold">
            تفريغ مرفقات المغادرين
          </h3>
          <p className="text-sm leading-relaxed text-ink/60">
            تحرير التخزين بحذف مرفقات المستخدمين المعطّلين مع إبقاء درجاتهم.
          </p>
        </Link>
        {ctx.isSuper && (
          <Link
            href="/admin/resources"
            className="card-link p-5"
          >
            <IconBadge icon="star" tone="gold" />
            <h3 className="mb-2 font-display text-lg font-semibold">أسئلة وإثراء</h3>
            <p className="text-sm leading-relaxed text-ink/60">
              ملفّات PDF عامّة (بلا تسجيل دخول) للتدرّب حسب الصفّ.
            </p>
          </Link>
        )}
        {ctx.isSuper && (
          <Link
            href="/admin/settings"
            className="card-link p-5"
          >
            <IconBadge icon="gear" />
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
