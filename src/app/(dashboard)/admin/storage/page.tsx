// src/app/(dashboard)/admin/storage/page.tsx
// المدير العام: إشراف على التخزين والمرفقات (إحصاءات، قراءة فقط).
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import StorageAlert from "@/components/admin/StorageAlert";
import LargestFiles, { type BigFileRow } from "@/components/admin/LargestFiles";
import { TABLE_LABELS, readDbStorage } from "@/lib/dbStorage";

export const dynamic = "force-dynamic";

const NO_SCHOOL = "على مستوى المنصّة";

function fmt(n: number): string {
  if (n < 1024) return `${n} ب`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} ك.ب`;
  return `${(n / (1024 * 1024)).toFixed(1)} م.ب`;
}

const KIND_LABEL: Record<string, string> = {
  EXAM_FILE: "ملفات الاختبارات",
  ANSWER_UPLOAD: "صور إجابات الطلاب",
};

export default async function AdminStoragePage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  if (!ctx.isSuper) redirect("/admin"); // إشراف على مستوى المنصّة

  const [db, bigRaw, agg, byKind, atts] = await Promise.all([
    readDbStorage(true),
    // أكبر ملفّات الإثراء (بلا بايتاتها): أغلب استهلاك القاعدة عادةً.
    prisma.enrichmentFile.findMany({
      where: { kind: "FILE" },
      orderBy: { sizeBytes: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        sizeBytes: true,
        downloadCount: true,
        teacherId: true,
        gradeLevel: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } },
        sourceTeacher: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.attachment.aggregate({
      _count: { _all: true },
      _sum: { sizeBytes: true },
    }),
    prisma.attachment.groupBy({
      by: ["kind"],
      _count: { _all: true },
      _sum: { sizeBytes: true },
    }),
    // الحقول الدنيا فقط (بلا data) لتجميع حسب المؤسّسة.
    prisma.attachment.findMany({
      select: {
        kind: true,
        sizeBytes: true,
        quiz: {
          select: { creator: { select: { school: { select: { name: true } } } } },
        },
        session: {
          select: {
            student: { select: { school: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  const totalBytes = agg._sum.sizeBytes ?? 0;

  const bigRows: BigFileRow[] = bigRaw.map((f) => ({
    id: f.id,
    title: f.title,
    sizeBytes: f.sizeBytes,
    gradeName: f.gradeLevel.name,
    downloadCount: f.downloadCount,
    ownerLabel: f.teacher
      ? `خاصّ بالمدرّس ${f.teacher.firstName} ${f.teacher.lastName}`
      : f.sourceTeacher
        ? `عامّ (معتمَد من ${f.sourceTeacher.firstName} ${f.sourceTeacher.lastName})`
        : "عامّ (من المدير العام)",
  }));

  // تجميع حسب المؤسّسة (المالك: مُنشئ ملف الاختبار، أو طالب صورة الإجابة).
  const bySchool = new Map<string, { bytes: number; count: number }>();
  for (const a of atts) {
    const name =
      a.kind === "EXAM_FILE"
        ? a.quiz?.creator.school?.name ?? NO_SCHOOL
        : a.session?.student.school?.name ?? NO_SCHOOL;
    const cur = bySchool.get(name) ?? { bytes: 0, count: 0 };
    cur.bytes += a.sizeBytes;
    cur.count += 1;
    bySchool.set(name, cur);
  }
  const schoolRows = [...bySchool.entries()].sort((x, y) => y[1].bytes - x[1].bytes);

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin" className="-my-2 inline-block py-2 text-base font-semibold text-red-800 hover:text-red-900 hover:underline">
          ← لوحة المدير
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">التخزين والمرفقات</h2>
        <p className="mt-1 text-sm text-ink/60">
          المرفقات (صور/PDF) مُخزَّنة داخل قاعدة البيانات. راقب الحجم.
        </p>
      </div>

      {db && (
        <section className="mb-8" aria-label="حجم قاعدة البيانات">
          <StorageAlert s={db} />
          <div className="card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display font-semibold">حجم قاعدة البيانات</h3>
              <p className="text-sm text-ink/70">
                {fmt(db.usedBytes)} من {fmt(db.limitBytes)} ({db.percent}%)
              </p>
            </div>
            <div
              className="mt-3 h-3 w-full overflow-hidden rounded-full bg-ink/10"
              role="progressbar"
              aria-valuenow={db.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="نسبة استهلاك التخزين"
            >
              <div
                className={`h-full rounded-full ${
                  db.level === "critical" ? "bg-red-600" : db.level === "warn" ? "bg-amber-500" : "bg-primary"
                }`}
                style={{ width: `${db.percent}%` }}
              />
            </div>
            {db.topTables.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {db.topTables.map((t) => (
                  <li key={t.name} className="flex items-center justify-between gap-3">
                    <span className="text-ink/80">{TABLE_LABELS[t.name] ?? t.name}</span>
                    <span className="shrink-0 text-ink/70">{fmt(t.bytes)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink/60">
              الحدّ المفترض 512 م.ب (خطة Neon المجانية) ويُنبَّه عند 70% ثم 90%. بعد الترقية اضبط{" "}
              <bdi dir="ltr">DB_STORAGE_LIMIT_MB</bdi> في إعدادات Vercel. ملاحظة: Neon يحتسب فروع المشروع كلّها
              (مثل فرع التطوير) ضمن حدّ الخطة، فقد يكون استهلاكك الحقيقي أعلى قليلاً مما يظهر هنا.
            </p>
          </div>
        </section>
      )}

      <LargestFiles rows={bigRows} />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-ink/60">إجمالي المرفقات</p>
          <p className="mt-1 font-display text-2xl font-bold">
            {agg._count._all}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-ink/60">الحجم الكلّي</p>
          <p className="mt-1 font-display text-2xl font-bold">{fmt(totalBytes)}</p>
        </div>
        {byKind.map((k) => (
          <div key={k.kind} className="card p-4">
            <p className="text-sm text-ink/60">{KIND_LABEL[k.kind] ?? k.kind}</p>
            <p className="mt-1 font-display text-2xl font-bold">
              {fmt(k._sum.sizeBytes ?? 0)}
            </p>
            <p className="text-xs text-ink/40">{k._count._all} ملف</p>
          </div>
        ))}
      </div>

      <h3 className="mb-3 font-display font-semibold">حسب المؤسّسة</h3>
      {schoolRows.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">لا مرفقات بعد.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[420px] text-right text-sm">
            <thead className="border-b border-line text-xs text-ink/50">
              <tr>
                <th className="p-3 font-medium">المؤسّسة</th>
                <th className="p-3 font-medium">عدد المرفقات</th>
                <th className="p-3 font-medium">الحجم</th>
              </tr>
            </thead>
            <tbody>
              {schoolRows.map(([name, v]) => (
                <tr key={name} className="border-b border-line/60 last:border-0">
                  <td className="p-3 font-medium">{name}</td>
                  <td className="p-3 text-ink/70">{v.count}</td>
                  <td className="p-3 text-ink/70">{fmt(v.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-5 text-xs text-ink/40">
        ملاحظة: لتقليل الحجم تُضغط الصور تلقائياً قبل الرفع. عند كِبَر الحجم
        مستقبلاً يُنقل التخزين لمزوّد خارجي عبر طبقة التجريد دون تغيير الواجهات.
      </p>
    </DashboardShell>
  );
}
