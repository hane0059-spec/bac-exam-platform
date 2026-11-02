// src/app/(dashboard)/admin/activity/page.tsx
// المدير العام: من هو نشط حالياً على المنصّة (آخر 5 دقائق) أو مؤخراً (30 دقيقة) أو ضمن فترة أطول
// (24 ساعة/أسبوع/شهر) بحسب آخر ظهور لكل مستخدم.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import { roleLabel } from "@/lib/gender";
import { agoArabic } from "@/lib/relativeTime";
import {
  ACTIVITY_LIST_CAP,
  ACTIVITY_RANGES,
  ONLINE_MS,
  RECENT_MS,
  parseActivityRange,
} from "@/lib/activityRange";

export const dynamic = "force-dynamic";

function timeAgo(date: Date): string {
  return agoArabic(Date.now() - date.getTime());
}

const ROLE_COLORS: Record<string, string> = {
  STUDENT: "bg-primary/10 text-primary",
  TEACHER: "bg-gold/15 text-gold",
  ADMIN:   "bg-ink/10 text-ink",
  PARENT:  "bg-primary/10 text-primary-dark",
};

export default async function ActivityPage(props: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const ctx = await getAdminContext();
  if (!ctx || !ctx.isSuper) redirect("/admin");

  const range = parseActivityRange((await props.searchParams).range);
  const since = new Date(Date.now() - range.ms);

  const total = await prisma.user.count({ where: { lastSeenAt: { gte: since } } });
  const users = await prisma.user.findMany({
    where: { lastSeenAt: { gte: since } },
    orderBy: { lastSeenAt: "desc" },
    take: ACTIVITY_LIST_CAP,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      gender: true,
      lastSeenAt: true,
      school: { select: { name: true } },
      // للطالب: الاسم الكامل (بإضافة اسم الأب) والصفّ والمجموعات ليُعرَف بدقّة.
      studentProfile: { select: { fatherName: true, gradeLevel: { select: { name: true } } } },
      studentEnrollments: { where: { isActive: true }, select: { groupName: true } },
    },
  });

  const now = Date.now();
  const online = users.filter(
    (u) => now - u.lastSeenAt!.getTime() < ONLINE_MS
  );
  const recent = users.filter((u) => {
    const d = now - u.lastSeenAt!.getTime();
    return d >= ONLINE_MS && d < RECENT_MS;
  });
  const earlier = users.filter((u) => now - u.lastSeenAt!.getTime() >= RECENT_MS);

  function editPath(u: (typeof users)[0]): string {
    if (u.role === "STUDENT") return `/admin/students/${u.id}/edit`;
    if (u.role === "PARENT")  return `/admin/parents/${u.id}`;
    return `/admin/users/${u.id}/edit`;
  }

  function fullName(u: (typeof users)[0]): string {
    const father = u.studentProfile?.fatherName?.trim();
    // لا نكرّر اسم الأب إن كان مكتوباً أصلاً داخل الاسم/الكنية.
    const dup = father && `${u.firstName} ${u.lastName}`.includes(father);
    return [u.firstName, father && !dup ? father : "", u.lastName].filter(Boolean).join(" ");
  }

  function UserRow({ u }: { u: (typeof users)[0] }) {
    const isOnline = now - u.lastSeenAt!.getTime() < ONLINE_MS;
    const grade = u.studentProfile?.gradeLevel.name;
    const groups = Array.from(
      new Set(u.studentEnrollments.map((e) => e.groupName?.trim()).filter((g): g is string => !!g))
    );
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${isOnline ? "bg-green-500" : "bg-amber-400"}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="font-medium text-ink">{fullName(u)}</span>
          {(u.school || grade || groups.length > 0) && (
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-ink/60">
              {u.school && <span>{u.school.name}</span>}
              {grade && (
                <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink/80">{grade}</span>
              )}
              {groups.length > 0 && <span>المجموعة: {groups.join("، ")}</span>}
            </span>
          )}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-ink/10 text-ink"}`}
        >
          {roleLabel(u.role, u.gender)}
        </span>
        <span className="w-28 shrink-0 text-left text-sm text-ink/60" dir="rtl">
          {timeAgo(u.lastSeenAt!)}
        </span>
        <Link
          href={editPath(u)}
          className="shrink-0 rounded-lg border border-line bg-surface px-3 py-1 text-xs font-medium text-primary transition hover:bg-primary/5"
        >
          عرض / تعديل
        </Link>
      </div>
    );
  }

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin" className="-my-2 inline-block py-2 text-base font-semibold text-red-800 hover:text-red-900 hover:underline">
          ← الرئيسية
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">النشاط</h2>
        <p className="mt-1 text-sm text-ink/60">
          يُحدَّث آخر ظهور لكل مستخدم عند طلباته — التحديث يدوي (أعِد تحميل الصفحة).
        </p>
        <nav aria-label="فترة النشاط" className="mt-3 flex flex-wrap gap-2">
          {ACTIVITY_RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin/activity?range=${r.key}`}
              aria-current={r.key === range.key ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                r.key === range.key
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-surface text-ink hover:bg-primary/5"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* إحصاء سريع */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600 sm:text-3xl">{online.length}</p>
          <p className="mt-1 text-sm text-ink/60">متصل الآن (آخر 5 د)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-amber-500 sm:text-3xl">{recent.length}</p>
          <p className="mt-1 text-sm text-ink/60">نشط مؤخراً (5–30 د)</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-ink sm:text-3xl">{total}</p>
          <p className="mt-1 text-sm text-ink/60">ظهروا خلال {range.label}</p>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="py-16 text-center text-ink/40">
          لا يوجد نشاط مسجَّل خلال {range.label}
        </div>
      ) : (
        <div className="space-y-6">
          {online.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 font-display font-semibold text-green-700">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" aria-hidden />
                متصل الآن
              </h3>
              <div className="space-y-2">
                {online.map((u) => (
                  <UserRow key={u.id} u={u} />
                ))}
              </div>
            </section>
          )}

          {total > users.length && (
            <p className="rounded-xl border border-line bg-surface px-4 py-2 text-sm text-ink/70">
              يُعرَض أحدث {users.length} من {total} مستخدماً — اختر فترة أقصر لرؤية الباقي.
            </p>
          )}

          {recent.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 font-display font-semibold text-amber-600">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden />
                نشط مؤخراً (منذ 5–30 دقيقة)
              </h3>
              <div className="space-y-2">
                {recent.map((u) => (
                  <UserRow key={u.id} u={u} />
                ))}
              </div>
            </section>
          )}

          {earlier.length > 0 && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 font-display font-semibold text-ink/70">
                <span className="h-2.5 w-2.5 rounded-full bg-ink/30" aria-hidden />
                قبل ذلك (خلال {range.label})
              </h3>
              <div className="space-y-2">
                {earlier.map((u) => (
                  <UserRow key={u.id} u={u} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </DashboardShell>
  );
}
