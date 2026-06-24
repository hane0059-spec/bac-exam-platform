// src/app/(dashboard)/admin/questions/import/page.tsx
// المدير العام يستورد أسئلة من ملفّ إلى البنك العام لأيّ مادة.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import DashboardShell from "@/components/DashboardShell";
import QuestionImporter from "@/components/teacher/QuestionImporter";

export const dynamic = "force-dynamic";

export default async function AdminImportQuestionsPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  if (!ctx.isSuper) redirect("/admin"); // البنك العام للمدير العام حصراً

  // كل المواد (عامّة) مع فصولها ودروسها.
  const subjects = await prisma.subject.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      chapters: {
        orderBy: { orderNum: "asc" },
        select: {
          id: true,
          title: true,
          concepts: {
            orderBy: { title: "asc" },
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">
          استيراد إلى البنك العام
        </h2>
        <Link
          href="/admin/questions"
          className="text-sm text-primary hover:underline"
        >
          ← البنك العام
        </Link>
      </div>

      <p className="mb-5 text-sm leading-relaxed text-ink/60">
        ارفع ملفّ <code className="rounded bg-ink/10 px-1">JSON</code> لأسئلة
        مادةٍ ما؛ تُحوَّل أنواعه تلقائياً وتُضاف إلى{" "}
        <b>البنك العام للمنصّة</b> (مرئيّة لكلّ مدرّسي تلك المادّة لينسخوا ما
        يشاؤون منها). يبقى الملفّ المصدر خارج المنصّة — يُخزَّن النصّ فقط.
      </p>

      <QuestionImporter
        endpoint="/api/admin/questions/import"
        bankPath="/admin/questions"
        bankLabel="البنك العام"
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          chapters: s.chapters.map((c) => ({
            id: c.id,
            title: c.title,
            concepts: c.concepts.map((co) => ({ id: co.id, title: co.title })),
          })),
        }))}
      />
    </DashboardShell>
  );
}
