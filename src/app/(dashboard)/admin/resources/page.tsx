// src/app/(dashboard)/admin/resources/page.tsx
// المدير العام: إدارة ملفّات «أسئلة وإثراء» العامّة (بلا تسجيل دخول) حسب الصفّ.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import ResourcesManager from "@/components/admin/ResourcesManager";
import TeacherEnrichmentReview, {
  type ReviewRow,
} from "@/components/admin/TeacherEnrichmentReview";

export const dynamic = "force-dynamic";

export default async function AdminResourcesPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  if (!ctx.isSuper) redirect("/admin");

  const [gradeLevels, pendingRaw, publishedRaw] = await Promise.all([
    prisma.gradeLevel.findMany({
      orderBy: { orderNum: "asc" },
      include: {
        enrichmentFiles: {
          where: { teacherId: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            sizeBytes: true,
            createdAt: true,
            downloadCount: true,
            kind: true,
            body: true,
            mimeType: true,
          },
        },
      },
    }),
    // محتوى مدرّسين بانتظار اعتماد المدير لنشره على الصفحة العامّة.
    prisma.enrichmentFile.findMany({
      where: { teacherId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        sizeBytes: true,
        kind: true,
        body: true,
        mimeType: true,
        gradeLevel: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } },
      },
    }),
    // عناصر اعتُمدت سابقاً وصارت عامّة (teacherId=null) مع الاحتفاظ بمصدرها.
    prisma.enrichmentFile.findMany({
      where: { teacherId: null, sourceTeacherId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        sizeBytes: true,
        kind: true,
        body: true,
        mimeType: true,
        gradeLevel: { select: { name: true } },
        sourceTeacher: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const pending: ReviewRow[] = pendingRaw
    .filter((f) => f.teacher)
    .map((f) => ({
      id: f.id,
      title: f.title,
      sizeBytes: f.sizeBytes,
      kind: f.kind,
      body: f.body,
      mimeType: f.mimeType,
      gradeName: f.gradeLevel.name,
      teacherName: `${f.teacher!.firstName} ${f.teacher!.lastName}`,
    }));
  const published: ReviewRow[] = publishedRaw
    .filter((f) => f.sourceTeacher)
    .map((f) => ({
      id: f.id,
      title: f.title,
      sizeBytes: f.sizeBytes,
      kind: f.kind,
      body: f.body,
      mimeType: f.mimeType,
      gradeName: f.gradeLevel.name,
      teacherName: `${f.sourceTeacher!.firstName} ${f.sourceTeacher!.lastName}`,
    }));

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin" className="text-base font-semibold text-red-800 hover:text-red-900 hover:underline">
          ← لوحة المدير
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">أسئلة وإثراء</h2>
        <p className="mt-1 text-sm text-ink/60">
          لوحة إعلانات عامّة (بلا تسجيل دخول): ملفّات PDF/Word وصور ومنشورات نصّية لكل صفّ، يراها أي زائر في صفحة{" "}
          <a
            href="/resources"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            «أسئلة وإثراء» ↗
          </a>
          . فعّل ظهور رابطها في صفحة الدخول من{" "}
          <Link href="/admin/settings" className="text-primary hover:underline">
            الإعدادات
          </Link>
          .
        </p>
      </div>

      {(pending.length > 0 || published.length > 0) && (
        <div className="mb-8">
          <h3 className="mb-3 font-display text-lg font-bold">منشورات المدرّسين</h3>
          <TeacherEnrichmentReview pending={pending} published={published} />
        </div>
      )}

      <h3 className="mb-3 font-display text-lg font-bold">محتواك العامّ</h3>
      <ResourcesManager
        gradeLevels={gradeLevels.map((g) => ({
          id: g.id,
          name: g.name,
          files: g.enrichmentFiles.map((f) => ({
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
    </DashboardShell>
  );
}
