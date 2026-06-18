// src/app/(dashboard)/teacher/curriculum/page.tsx
// المدرّس: إدارة بنية المنهج (وحدات/فصول/دروس).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import CurriculumManager, {
  type CurriculumSubject,
} from "@/components/teacher/CurriculumManager";

export const dynamic = "force-dynamic";

export default async function CurriculumPage() {
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

  const data: CurriculumSubject[] = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    units: s.units.map((u) => ({
      id: u.id,
      title: u.title,
      chapters: u.chapters.map((c) => ({
        id: c.id,
        title: c.title,
        lessons: c.concepts.map((l) => ({ id: l.id, title: l.title })),
      })),
    })),
  }));

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link
          href="/teacher/questions"
          className="text-sm text-primary hover:underline"
        >
          ← بنك الأسئلة
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">بنية المنهج</h2>
        <p className="mt-1 text-sm text-ink/60">
          نظّم موادّك إلى وحدات وفصول ودروس لتشجير الأسئلة وتسهيل تكوين
          الاختبارات.
        </p>
      </div>
      <CurriculumManager subjects={data} />
    </DashboardShell>
  );
}
