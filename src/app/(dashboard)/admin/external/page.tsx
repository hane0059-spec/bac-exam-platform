// src/app/(dashboard)/admin/external/page.tsx
// المدير: استيراد طلاب خارجيين وإسناد اختبار منشور لهم.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import ExternalImport from "@/components/admin/ExternalImport";

export const dynamic = "force-dynamic";

export default async function AdminExternalPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const [quizzesRaw, grades] = await Promise.all([
    prisma.quiz.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      include: {
        creator: { select: { firstName: true, lastName: true } },
        subject: { select: { name: true } },
      },
    }),
    prisma.gradeLevel.findMany({
      select: { id: true, name: true },
      orderBy: { orderNum: "asc" },
    }),
  ]);

  const quizzes = quizzesRaw.map((q) => ({
    id: q.id,
    title: q.title,
    teacherName: `${q.creator.firstName} ${q.creator.lastName}`,
    subjectName: q.subject.name,
  }));

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← لوحة المدير
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">
          استيراد طلاب خارجيين وإسناد اختبار
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          يُنشئ حسابات للطلاب المستوردين (يدخلون برمز الطالب أو الاسم) ويُسنِد
          إليهم الاختبار المنشور المختار كاختبار خارجي.
        </p>
      </div>
      <ExternalImport quizzes={quizzes} grades={grades} />
    </DashboardShell>
  );
}
