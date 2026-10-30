// src/app/(dashboard)/teacher/certificates/[sessionId]/page.tsx
// المدرّس: إصدار شهادة تقدير رسمية ملوّنة لكل طالب نجح (60% فأكثر) بتقدير حسب السلّم الدولي (صورة/PDF/طباعة + إشعار الطالب).
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadTeacherCertificate } from "@/lib/certificateServer";
import DashboardShell from "@/components/DashboardShell";
import CertificateMaker from "@/components/teacher/CertificateMaker";

export const dynamic = "force-dynamic";

export default async function TeacherCertificatePage(
  props: {
    params: Promise<{ sessionId: string }>;
  }
) {
  const params = await props.params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const cert = await loadTeacherCertificate(params.sessionId, session.sub);
  if (!cert.ok && cert.reason === "notfound") notFound();

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href={cert.ok ? `/teacher/quizzes/${cert.quizId}/results` : "/teacher/results"}
          className="-my-2 inline-block py-2 text-base font-semibold text-red-800 hover:text-red-900 hover:underline"
        >
          ← نتائج الاختبار
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">
          شهادة تقدير{cert.ok ? `: ${cert.data.studentName}` : ""}
        </h2>
      </div>
      {cert.ok ? (
        <CertificateMaker
          data={cert.data}
          notifyUrl={`/api/teacher/certificates/${cert.sessionId}/notify`}
          allowCustomClosing
        />
      ) : (
        <div className="card p-6 text-ink/70">
          {cert.reason === "ineligible" ? cert.message : "تعذّر تحميل الشهادة."}
        </div>
      )}
    </DashboardShell>
  );
}
