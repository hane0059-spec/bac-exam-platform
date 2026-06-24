// src/app/(dashboard)/teacher/questions/import/page.tsx
// استيراد أسئلة من ملفّ بنك (JSON) إلى بنك المدرّس: اختيار الهدف ← معاينة ← تأكيد.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell from "@/components/DashboardShell";
import { getTeacherSubjectTree } from "@/lib/teacher";
import QuestionImporter from "@/components/teacher/QuestionImporter";

export const dynamic = "force-dynamic";

export default async function ImportQuestionsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");

  const subjects = await getTeacherSubjectTree(session.sub);

  return (
    <DashboardShell session={session}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">استيراد أسئلة من ملفّ</h2>
        <Link
          href="/teacher/questions"
          className="text-sm text-primary hover:underline"
        >
          ← بنك الأسئلة
        </Link>
      </div>

      <p className="mb-5 text-sm leading-relaxed text-ink/60">
        ارفع ملفّ <code className="rounded bg-ink/10 px-1">JSON</code> يحوي حقل{" "}
        <code className="rounded bg-ink/10 px-1">questions</code>. تُحوَّل أنواع
        الملفّ تلقائياً إلى أنواع المنصّة (اختيار/صح-خطأ/ترتيب/مطابقة/ملء
        فراغات)، وما لا يقابله نوعٌ آليّ يُستورَد سؤالاً مقالياً يُصحَّح يدوياً
        مع نموذج إجابته. الأسئلة المعتمدة على شكل يُدرَج وصفها نصّاً (بلا صورة).
        ستظهر معاينة قبل أيّ كتابة.
      </p>

      <QuestionImporter
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
