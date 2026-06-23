// src/app/(dashboard)/student/certificate/[quizId]/page.tsx
// شهادة تقدير قابلة للطباعة للطالب المتفوّق — مشتقّة من أفضل جلسة مؤهَّلة (بلا تغيير مخطط).
// حراسة: جلسات الطالب نفسه فقط، مكتملة ومعتمدة (لا تصحيح معلّق)، وأفضل نسبة ≥ العتبة.
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PrintButton from "@/components/student/PrintButton";
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
      school: { select: { name: true } },
    },
  });
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.quizId },
    select: { title: true, subject: { select: { name: true } } },
  });
  if (!me || !quiz) notFound();

  const studentName = `${me.firstName} ${me.lastName}`;
  const dateStr = formatDay(best.completedAt ?? new Date());

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link
          href="/student/quizzes"
          className="text-sm text-primary hover:underline"
        >
          ← اختباراتي
        </Link>
        <span className="mr-auto" />
        <PrintButton label="طباعة الشهادة" />
      </div>

      {/* الشهادة */}
      <div className="certificate relative overflow-hidden rounded-2xl border-4 border-double border-gold bg-surface px-6 py-12 text-center shadow-sm [print-color-adjust:exact] [-webkit-print-color-adjust:exact] sm:px-12">
        {/* زخرفة ركنية */}
        <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold/10" />
        <span className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/10" />

        <p className="font-display text-sm tracking-widest text-gold">
          شهادة تقدير
        </p>
        <div className="mx-auto my-4 h-px w-24 bg-gold/40" />

        <p className="text-ink/60">تشهد المنصّة بأنّ الطالب/ة</p>
        <p className="my-3 font-display text-3xl font-bold text-primary-dark sm:text-4xl">
          {studentName}
        </p>

        <p className="mx-auto max-w-xl leading-loose text-ink/70">
          قد أبدى تفوّقاً في اختبار{" "}
          <span className="font-semibold text-ink">«{quiz.title}»</span> في مادة{" "}
          <span className="font-semibold text-ink">{quiz.subject.name}</span>،
          محقّقاً نسبة
        </p>

        <p className="my-4 font-display text-5xl font-bold text-gold">{pct}%</p>

        <p className="inline-block rounded-full bg-gold/15 px-4 py-1 font-display text-lg font-bold text-gold [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
          بتقدير: {honor}
        </p>

        <div className="mt-10 flex items-end justify-between gap-4 text-sm text-ink/60">
          <span>
            <bdi dir="ltr">{dateStr}</bdi>
            <br />
            التاريخ
          </span>
          {me.school?.name && (
            <span className="text-left">
              {me.school.name}
              <br />
              المؤسّسة
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
