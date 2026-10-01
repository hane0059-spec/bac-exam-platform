// src/app/(dashboard)/teacher/enrichment/page.tsx
// المدرّس: «أسئلة وإثراء» الخاصّة به (يفعّلها المدير العام). لا يراها إلا طلابه المسجّلون عنده.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { teacherCanEnrichment } from "@/lib/teacher";
import { teacherGradeLevels } from "@/lib/enrichment";
import DashboardShell from "@/components/DashboardShell";
import ResourcesManager from "@/components/admin/ResourcesManager";

export const dynamic = "force-dynamic";

export default async function TeacherEnrichmentPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "TEACHER") redirect("/");
  if (!(await teacherCanEnrichment(session.sub))) redirect("/teacher");

  const grades = await teacherGradeLevels(session.sub);
  const [files, published] = await Promise.all([
    prisma.enrichmentFile.findMany({
      where: { teacherId: session.sub },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        sizeBytes: true,
        downloadCount: true,
        kind: true,
        body: true,
        mimeType: true,
        gradeLevelId: true,
      },
    }),
    // عناصر اعتمدها المدير العام ونشرها على الصفحة العامّة — قراءة فقط.
    prisma.enrichmentFile.findMany({
      where: { sourceTeacherId: session.sub },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        gradeLevel: { select: { name: true } },
      },
    }),
  ]);

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/teacher" className="text-base font-semibold text-red-800 hover:text-red-900 hover:underline">
          ← لوحتي
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">أسئلة وإثراء</h2>
        <p className="mt-1 text-sm text-ink/60">
          ملفّات (PDF/Word) وصور ومنشورات نصّية تظهر <b>لطلابك المسجّلين عندك فقط</b> في
          صفحة «أسئلة وإثراء» بلوحتهم. لا تظهر لغيرهم ولا في الصفحة العامّة.
        </p>
      </div>
      {published.length > 0 && (
        <div className="card mb-6 p-5">
          <h3 className="mb-1 font-display font-semibold">
            منشوراتك المعتمدة على الصفحة العامة
            <span className="mr-2 text-sm font-normal text-ink/50">({published.length})</span>
          </h3>
          <p className="mb-3 text-xs text-ink/50">
            اعتمدها المدير العام فصارت ظاهرة للجميع في صفحة «أسئلة وإثراء» العامّة — لم تعد في
            مكتبتك الخاصّة أدناه.
          </p>
          <ul className="space-y-2">
            {published.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5"
              >
                <span className="truncate text-sm font-medium">{f.title}</span>
                <span className="shrink-0 rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary-dark">
                  منشور عامّ · {f.gradeLevel.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {grades.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا مواد مُسنَدة لك بعد — اطلب من الإدارة إسناد موادّك أولاً.
        </div>
      ) : (
        <ResourcesManager
          endpoints={{
            upload: "/api/teacher/enrichment",
            post: "/api/teacher/enrichment/post",
            remove: "/api/teacher/enrichment",
          }}
          gradeLevels={grades.map((g) => ({
            id: g.id,
            name: g.name,
            files: files
              .filter((f) => f.gradeLevelId === g.id)
              .map((f) => ({
                id: f.id,
                title: f.title,
                sizeBytes: f.sizeBytes,
                downloadCount: f.downloadCount,
                kind: f.kind,
                body: f.body,
                mimeType: f.mimeType,
              })),
          }))}
        />
      )}
    </DashboardShell>
  );
}
