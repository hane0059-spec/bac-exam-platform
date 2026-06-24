// src/app/(dashboard)/admin/retention/page.tsx
// المدير: بصمة تخزين كل مستخدم (من مرفقاته) + تفريغ مرفقات المغادرين (المعطّلين).
// تبقى الدرجات والقشور؛ يُحرَّر الثقيل فقط. بعزل المؤسّسة لمدير المدرسة.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import PurgeAttachmentsButton from "@/components/admin/PurgeAttachmentsButton";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const TOP = 100;

function fmt(n: number): string {
  if (n < 1024) return `${n} ب`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} ك.ب`;
  return `${(n / (1024 * 1024)).toFixed(1)} م.ب`;
}

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "طالب",
  TEACHER: "مدرّس",
  ADMIN: "مدير",
  PARENT: "وليّ أمر",
};

export default async function AdminRetentionPage({
  searchParams,
}: {
  searchParams: { inactive?: string };
}) {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");

  const inactiveOnly = searchParams.inactive === "1";

  // فلتر المالك: عزل المؤسّسة لمدير المدرسة + المعطّلون فقط عند الطلب.
  const uploaderFilter: Prisma.UserWhereInput = {
    ...(ctx.isSuper ? {} : { schoolId: ctx.schoolId }),
    ...(inactiveOnly ? { isActive: false } : {}),
  };
  const where: Prisma.AttachmentWhereInput =
    Object.keys(uploaderFilter).length > 0
      ? { uploadedBy: uploaderFilter }
      : {};

  const groups = await prisma.attachment.groupBy({
    by: ["uploadedById"],
    where,
    _sum: { sizeBytes: true },
    _count: { _all: true },
    orderBy: { _sum: { sizeBytes: "desc" } },
    take: TOP,
  });

  const users = await prisma.user.findMany({
    where: { id: { in: groups.map((g) => g.uploadedById) } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      school: { select: { name: true } },
    },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const rows = groups
    .map((g) => ({
      user: userById.get(g.uploadedById),
      bytes: g._sum.sizeBytes ?? 0,
      count: g._count._all,
    }))
    .filter((r) => r.user);

  const pill = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm transition ${
      active ? "bg-primary text-white" : "bg-ink/5 text-ink/70 hover:bg-primary-light"
    }`;

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← لوحة المدير
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">
          تفريغ مرفقات المغادرين
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink/60">
          المستخدمون مرتّبون ببصمتهم التخزينية (من مرفقاتهم). لتحرير الحجم،
          عطّل المستخدم المغادر من صفحة تحريره ثمّ فرّغ مرفقاته هنا — تبقى
          درجاته وسجلّاته، ويُحذف الثقيل فقط (صور/ملفّات). <b>لا تراجع.</b>
        </p>
      </div>

      <div className="mb-5 flex gap-2">
        <Link href="/admin/retention" className={pill(!inactiveOnly)}>
          الكلّ
        </Link>
        <Link href="/admin/retention?inactive=1" className={pill(inactiveOnly)}>
          المعطّلون فقط
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          {inactiveOnly
            ? "لا مرفقات لمستخدمين معطّلين."
            : "لا مرفقات بعد."}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-right text-sm">
            <thead className="border-b border-line text-xs text-ink/50">
              <tr>
                <th className="p-3 font-medium">المستخدم</th>
                <th className="p-3 font-medium">الدور</th>
                <th className="p-3 font-medium">المؤسّسة</th>
                <th className="p-3 font-medium">المرفقات</th>
                <th className="p-3 font-medium">الحجم</th>
                <th className="p-3 font-medium">الحالة</th>
                <th className="p-3 font-medium">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const u = r.user!;
                return (
                  <tr key={u.id} className="border-b border-line/60 last:border-0">
                    <td className="p-3 font-medium">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="p-3 text-ink/60">{ROLE_LABEL[u.role]}</td>
                    <td className="p-3 text-ink/50">
                      {u.school?.name ?? "—"}
                    </td>
                    <td className="p-3 text-ink/70">{r.count}</td>
                    <td className="p-3 font-medium">{fmt(r.bytes)}</td>
                    <td className="p-3">
                      {u.isActive ? (
                        <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs text-primary-dark">
                          نشط
                        </span>
                      ) : (
                        <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-xs text-ink/50">
                          معطّل
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <PurgeAttachmentsButton
                        userId={u.id}
                        disabled={u.isActive}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-5 text-xs text-ink/40">
        يظهر أعلى {TOP} مستخدماً بصمةً تخزينية. التفريغ متاح للمعطّلين فقط حمايةً
        للبيانات الحيّة.
      </p>
    </DashboardShell>
  );
}
