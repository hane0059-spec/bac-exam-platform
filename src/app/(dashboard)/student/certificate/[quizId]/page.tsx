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
import { loadIssuedStyle } from "@/lib/certIssue";

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
  // من دون حدّ النجاح لا يُصدر الطالب شهادته بنفسه، لكن تُفتح له إن أصدرها مدرّسه وأشعره بها.
  const issued = best && certificateHonor(pct) === null
    ? await prisma.notification.findFirst({
        where: {
          userId: session.sub,
          type: "certificate_issued",
          linkUrl: `/student/certificate/${params.quizId}`,
        },
        select: { id: true },
      })
    : null;
  const honor = best ? certificateHonor(pct) ?? (issued ? "مشارك" : null) : null;
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
  // تصميم الشهادة كما أصدره المدرّس (بلا خيارات للطالب).
  const issuedStyle = await loadIssuedStyle(params.quizId, session.sub);

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
      <div className="mb-4 print:hidden">
        <h2 className="font-display text-xl font-bold">
          {honor === "مشارك" ? "شهادة مشاركتك" : "شهادة تقديرك"}
        </h2>
        <p className="mt-1 text-sm text-ink/60">
          أصدرها لك {quiz.creator.firstName} {quiz.creator.lastName} في «{quiz.title}». حمّلها أو اطبعها من الأزرار أدناه.
        </p>
      </div>
      <CertificateMaker
        studentView
        issued={issuedStyle}
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
          closing: issuedStyle?.closing || undefined,
        }}
      />
    </main>
  );
}
