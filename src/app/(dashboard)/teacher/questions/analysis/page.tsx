// src/app/(dashboard)/teacher/questions/analysis/page.tsx
// تحليل الأسئلة (Item Analysis): أسئلة بنك المدرّس الأكثر خطأً عبر كل
// محاولات الطلاب — تكشف سؤالاً ملتبساً أو مفهوماً يصعب على أغلبهم.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import MathText from "@/components/MathText";

export const dynamic = "force-dynamic";

// حدّ أدنى من المحاولات كي يظهر السؤال — يتفادى ضجيج الأرقام من محاولة واحدة.
const MIN_ATTEMPTS = 3;

const TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: "اختيار من متعدد",
  TRUE_FALSE: "صح / خطأ",
  SHORT_ANSWER: "إجابة قصيرة",
  ESSAY: "مقالي",
  ORDER: "ترتيب",
  FILL_BLANK: "ملء الفراغات",
  MATCHING: "مطابقة",
  CALCULATION: "حساب",
  DIAGRAM_LABEL: "توسيم رسم",
};
const DIFF_LABEL: Record<string, string> = {
  EASY: "سهل",
  MEDIUM: "متوسط",
  HARD: "صعب",
  EXPERT: "متقدّم",
};

export default async function QuestionAnalysisPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  // تجميع الإجابات لكل سؤال (صحيح/خطأ) ضمن أسئلة المدرّس غير المُلغاة.
  const grouped = await prisma.studentAnswer.groupBy({
    by: ["questionId", "isCorrect"],
    where: { question: { creatorId: session.sub, isCancelled: false } },
    _count: { _all: true },
  });

  const stats = new Map<string, { total: number; correct: number }>();
  for (const row of grouped) {
    const s = stats.get(row.questionId) ?? { total: 0, correct: 0 };
    s.total += row._count._all;
    if (row.isCorrect) s.correct += row._count._all;
    stats.set(row.questionId, s);
  }

  const eligibleIds = [...stats.entries()]
    .filter(([, s]) => s.total >= MIN_ATTEMPTS)
    .map(([id]) => id);

  const questions =
    eligibleIds.length > 0
      ? await prisma.question.findMany({
          where: { id: { in: eligibleIds } },
          select: {
            id: true,
            content: true,
            type: true,
            difficulty: true,
            subject: { select: { name: true } },
            chapter: { select: { title: true } },
          },
        })
      : [];

  const rows = questions
    .map((q) => {
      const s = stats.get(q.id)!;
      const errorRate = Math.round(100 * (1 - s.correct / s.total));
      return { ...q, ...s, errorRate };
    })
    .sort((a, b) => b.errorRate - a.errorRate || b.total - a.total);

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/teacher/questions" className="text-sm text-primary hover:underline">
          ← بنك الأسئلة
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">تحليل الأسئلة</h2>
        <p className="mt-1 text-sm text-ink/60">
          الأسئلة الأعلى نسبة خطأ عبر كل محاولات طلابك — مرتّبة تنازلياً. تحتاج{" "}
          {MIN_ATTEMPTS} محاولات على الأقلّ لتظهر هنا.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا بيانات كافية بعد — تحتاج أسئلتك {MIN_ATTEMPTS} محاولات على الأقلّ
          لكل سؤال كي يظهر هنا.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((q) => (
            <div key={q.id} className="card p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2.5 py-0.5 font-bold ${
                    q.errorRate >= 60
                      ? "bg-red-100 text-red-700"
                      : q.errorRate >= 35
                      ? "bg-gold/20 text-gold"
                      : "bg-primary-light text-primary-dark"
                  }`}
                >
                  نسبة الخطأ {q.errorRate}%
                </span>
                <span className="rounded-full bg-primary-light px-2.5 py-0.5 font-medium text-primary-dark">
                  {TYPE_LABEL[q.type] ?? q.type}
                </span>
                <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-ink/60">
                  {q.subject.name}
                </span>
                {q.chapter && (
                  <span className="text-ink/50">• {q.chapter.title}</span>
                )}
                <span className="text-ink/50">• {DIFF_LABEL[q.difficulty]}</span>
                <span className="text-ink/50">
                  • {q.correct}/{q.total} إجابة صحيحة
                </span>
              </div>
              <p className="leading-relaxed">
                <MathText text={q.content} />
              </p>
              <div className="mt-3">
                <Link
                  href={`/teacher/questions/${q.id}/edit`}
                  className="text-sm text-primary hover:underline"
                >
                  تعديل السؤال
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
