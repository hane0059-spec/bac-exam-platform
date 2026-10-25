// src/app/(dashboard)/student/certificate/[quizId]/page.tsx
// شهادة تقدير قابلة للطباعة للطالب المتفوّق — مشتقّة من أفضل جلسة مؤهَّلة (بلا تغيير مخطط).
// حراسة: جلسات الطالب نفسه فقط، مكتملة ومعتمدة (لا تصحيح معلّق)، وأفضل نسبة ≥ العتبة.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import CertificateMaker from "@/components/teacher/CertificateMaker";
import { getBranding } from "@/lib/branding";
import { certificateHonor } from "@/lib/certificate";

export const dynamic = "force-dynamic";

function formatDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default async function CertificatePage({
  params,
}: {
  params: { quizId: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "STUDENT") redirect("/");

  // جلسات الطالب المنتهية لهذا الاختبار (ملكيته فقط).
  const sessions = await prisma.examSession.findMany({
    where: {
      quizId: params.quizId,
      studentId: session.sub,
      status: { in: ["COMPLETED", "TIMED_OUT"] },
      needsGrading: false,
    },
    select: {
      percentage: true,
      completedAt: true,
      answers: { where: { needsReview: true }, select: { id: true }, take: 1 },
    },
  });

  // أفضل جلسة معتمدة (لا تحوي إجابةً بانتظار المراجعة).
  const finalized = sessions.filter((s) => s.answers.length === 0);
  const best = finalized.reduce<(typeof finalized)[number] | null>(
    (acc, s) =>
      acc === null || Number(s.percentage) > Number(acc.percentage) ? s : acc,
    null
  );

  const pct = best ? Number(best.percentage) : 0;
  const honor = best ? certificateHonor(pct) : null;
  if (!best || honor === null) notFound();

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      firstName: true,
      lastName: true,
      gender: true,
    },
  });
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.quizId },
    select: {
      title: true,
      subject: { select: { name: true } },
      creator: { select: { firstName: true, lastName: true } },
    },
  });
  if (!me || !quiz) notFound();
  const brand = await getBranding();

  const dateStr = formatDay(best.completedAt ?? new Date());

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link
          href="/student/quizzes"
          className="text-base font-semibold text-red-800 hover:text-red-900 hover:underline"
        >
          ← اختباراتي
        </Link>
      </div>
      <CertificateMaker
        data={{
          studentName: `${me.firstName} ${me.lastName}`,
          female: me.gender === "FEMALE",
          quizTitle: quiz.title,
          subjectName: quiz.subject.name,
          percentage: pct,
          honor,
          dateStr,
          teacherName: `${quiz.creator.firstName} ${quiz.creator.lastName}`,
          brandName: brand.name,
        }}
      />
    </main>
  );
}
