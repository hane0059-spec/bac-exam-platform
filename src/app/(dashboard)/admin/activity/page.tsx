// src/app/(dashboard)/admin/activity/page.tsx
// المدير العام: من هو نشط حالياً على المنصّة (آخر 5 دقائق) أو مؤخراً (آخر 30 دقيقة).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import { roleLabel } from "@/lib/gender";

export const dynamic = "force-dynamic";

const ONLINE_MS  = 5  * 60 * 1000; // 5 دقائق
const RECENT_MS  = 30 * 60 * 1000; // 30 دقيقة

function timeAgo(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60)  return "منذ ثوانٍ";
  if (sec < 3600) return `منذ ${Math.floor(sec / 60)} د`;
  return `منذ ${Math.floor(sec / 3600)} س`;
}

const ROLE_COLORS: Record<string, string> = {
  STUDENT: "bg-primary/10 text-primary",
  TEACHER: "bg-gold/15 text-gold",
  ADMIN:   "bg-ink/10 text-ink",
  PARENT:  "bg-primary/10 text-primary-dark",
};

export default async function ActivityPage() {
  const ctx = await getAdminContext();
  if (!ctx || !ctx.isSuper) redirect("/admin");

  const since = new Date(Date.now() - RECENT_MS);

  const users = await prisma.user.findMany({
    where: { lastSeenAt: { gte: since } },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      gender: true,
      lastSeenAt: true,
      school: { select: { name: true } },
    },
  });

  const now = Date.now();
  const online = users.filter(
    (u) => now - u.lastSeenAt!.getTime() < ONLINE_MS
  );
  const recent = users.filter(
    (u) => now - u.lastSeenAt!.getTime() >= ONLINE_MS
  );

  function editPath(u: (typeof users)[0]): string {
    if (u.role === "STUDENT") return `/admin/students/${u.id}/edit`;
    if (u.role === "PARENT")  return `/admin/parents/${u.id}`;
    return `/admin/users/${u.id}/edit`;
  }

  function UserRow({ u }: { u: (typeof users)[0] }) {
    const isOnline = now - u.lastSeenAt!.getTime() < ONLINE_MS;
    return (
      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${isOnline ? "bg-green-500" : "bg-amber-400"}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="font-medium text-ink">
            {u.firstName} {u.lastName}
          </span>
          {u.school && (
            <span className="mr-2 text-sm text-ink/50">{u.school.name}</span>
          )}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-ink/10 text-ink"}`}
        >
          {roleLabel(u.role, u.gender)}
        </span>
        <span className="shrink-0 text-sm text-ink/45 w-20 text-left" dir="rtl">
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
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← الرئيسية
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">النشاط الحالي</h2>
        <p className="mt-1 text-sm text-ink/60">
          يتجدّد عند كل طلب يُجريه المستخدم — التحديث يدوي (أعِد تحميل الصفحة).
        </p>
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
          <p className="text-2xl font-bold text-ink sm:text-3xl">{users.length}</p>
          <p className="mt-1 text-sm text-ink/60">إجمالي آخر 30 د</p>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="py-16 text-center text-ink/40">
          لا يوجد نشاط مسجَّل خلال آخر 30 دقيقة
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
        </div>
      )}
    </DashboardShell>
  );
}
