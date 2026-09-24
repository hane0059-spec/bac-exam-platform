// src/app/(dashboard)/admin/resources/page.tsx
// المدير العام: إدارة ملفّات «أسئلة وإثراء» العامّة (بلا تسجيل دخول) حسب الصفّ.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";
import ResourcesManager from "@/components/admin/ResourcesManager";

export const dynamic = "force-dynamic";

export default async function AdminResourcesPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  if (!ctx.isSuper) redirect("/admin");

  const gradeLevels = await prisma.gradeLevel.findMany({
    orderBy: { orderNum: "asc" },
    include: {
      enrichmentFiles: {
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
  });

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-primary hover:underline">
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
