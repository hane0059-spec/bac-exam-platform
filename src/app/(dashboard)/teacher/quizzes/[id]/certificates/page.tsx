// src/app/(dashboard)/teacher/quizzes/[id]/certificates/page.tsx
// المدرّس: شهادات كل طلاب اختباره في ملفّ PDF واحد (أفضل محاولة معتمدة لكل طالب).
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadQuizCertificates } from "@/lib/certificateServer";
import DashboardShell from "@/components/DashboardShell";
import BulkCertificates from "@/components/teacher/BulkCertificates";

export const dynamic = "force-dynamic";

export default async function QuizCertificatesPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const res = await loadQuizCertificates(params.id, session.sub);
  if (!res.ok) notFound();

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href={`/teacher/quizzes/${params.id}/results`}
          className="text-base font-semibold text-red-800 hover:text-red-900 hover:underline"
        >
          ← نتائج الاختبار
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">شهادات الطلاب: {res.quizTitle}</h2>
      </div>
      <BulkCertificates quizId={params.id} quizTitle={res.quizTitle} items={res.items} />
    </DashboardShell>
  );
}
