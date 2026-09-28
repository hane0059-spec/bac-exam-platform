// src/app/(dashboard)/teacher/quizzes/generate/page.tsx
// توليد اختبار (أو عدّة نماذج) تلقائياً من بنك المدرّس حسب نطاق المنهج وتوازن
// الأنواع ودرجة كلية محدّدة — بديل سريع عن الاختيار اليدوي، مع بقاء التعديل
// اليدوي متاحاً بعد التوليد (كل نموذج يُفتح في الباني العادي).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import QuizGeneratorForm from "@/components/teacher/QuizGeneratorForm";

export const dynamic = "force-dynamic";

export default async function GenerateQuizPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const subjects = await prisma.subject.findMany({
    where: { teacherSubjects: { some: { teacherId: session.sub } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      units: {
        orderBy: { orderNum: "asc" },
        select: {
          id: true,
          title: true,
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
      },
    },
  });

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href="/teacher/quizzes"
          className="text-base font-semibold text-red-800 hover:text-red-900 hover:underline"
        >
          ← اختباراتي
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">توليد اختبار تلقائي</h2>
        <p className="mt-1 text-sm text-ink/60">
          اختر نطاقاً من منهجك وعدد كل نوع سؤال ودرجةً كليةً، وسيُشكَّل الاختبار (أو
          عدّة نماذج غير متطابقة) عشوائياً من بنكك — كمسوّدة تراجعها وتعدّلها يدوياً
          قبل النشر.
        </p>
      </div>
      {subjects.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا توجد مواد مسنَدة إليك بعد.
        </div>
      ) : (
        <QuizGeneratorForm subjects={subjects} />
      )}
    </DashboardShell>
  );
}
