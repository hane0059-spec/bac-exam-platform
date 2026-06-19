// src/app/(dashboard)/teacher/reports/page.tsx
// المدرّس: بلاغات الأخطاء على أسئلته (مراجعة/معالجة).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/datetime";
import DashboardShell from "@/components/DashboardShell";
import ReportRow from "@/components/teacher/ReportRow";
import type { Prisma, QuestionReportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "open", label: "المفتوحة", status: "OPEN" as QuestionReportStatus },
  { key: "all", label: "الكل", status: undefined },
] as const;

export default async function TeacherReportsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const tab = searchParams.tab === "all" ? "all" : "open";
  const statusFilter = tab === "open" ? "OPEN" : undefined;

  const where: Prisma.QuestionReportWhereInput = {
    question: { creatorId: session.sub },
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const reports = await prisma.questionReport.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      reason: true,
      status: true,
      teacherNote: true,
      createdAt: true,
      question: { select: { id: true, content: true, isCancelled: true } },
      student: { select: { firstName: true, lastName: true } },
    },
  });

  const pill = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm transition ${
      active ? "bg-primary text-white" : "bg-ink/5 text-ink/70 hover:bg-primary-light"
    }`;

  return (
    <DashboardShell session={session}>
      <div className="mb-5">
        <Link href="/teacher" className="text-sm text-primary hover:underline">
          ← لوحة المدرّس
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">بلاغات الأسئلة</h2>
        <p className="mt-1 text-sm text-ink/60">
          ملاحظات الطلاب عن أخطاء محتملة في أسئلتك.
        </p>
      </div>

      <div className="mb-5 flex gap-2">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/teacher/reports?tab=${f.key}`} className={pill(tab === f.key)}>
            {f.label}
          </Link>
        ))}
      </div>

      {reports.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">لا بلاغات.</div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <ReportRow
              key={r.id}
              id={r.id}
              questionId={r.question.id}
              questionContent={r.question.content}
              questionCancelled={r.question.isCancelled}
              reason={r.reason}
              studentName={`${r.student.firstName} ${r.student.lastName}`}
              status={r.status}
              teacherNote={r.teacherNote}
              createdAt={formatDateTime(r.createdAt)}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
