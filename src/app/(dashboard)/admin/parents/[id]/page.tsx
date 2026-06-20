// src/app/(dashboard)/admin/parents/[id]/page.tsx
// المدير: تفاصيل ولي أمر وإدارة روابطه بأبنائه (بعزل المؤسّسة).
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { getParentChildren } from "@/lib/parent";
import DashboardShell from "@/components/DashboardShell";
import ParentLinks from "@/components/admin/ParentLinks";
import CreatorNotesEditor from "@/components/admin/CreatorNotesEditor";
import { SOLO_MODE } from "@/lib/platformMode";

export const dynamic = "force-dynamic";

export default async function ParentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");
  if (SOLO_MODE) redirect("/admin"); // غير متاح في الوضع المبسّط

  const parent = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      schoolId: true,
      createdById: true,
      creatorNotes: true,
      school: { select: { name: true } },
    },
  });
  if (!parent || parent.role !== "PARENT") notFound();
  // عزل المؤسّسة: مدير المدرسة لا يدير أولياء خارج مؤسّسته.
  if (!ctx.isSuper && parent.schoolId !== ctx.schoolId) notFound();

  const children = await getParentChildren(parent.id);

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin/parents" className="text-sm text-primary hover:underline">
          ← أولياء الأمور
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">
          {parent.firstName} {parent.lastName}
        </h2>
        <p className="mt-1 flex gap-2 text-sm text-ink/50">
          {parent.email && <span dir="ltr">{parent.email}</span>}
          {ctx.isSuper && parent.school && <span>• {parent.school.name}</span>}
        </p>
      </div>

      <ParentLinks
        parentId={parent.id}
        children={children.map((c) => ({
          id: c.id,
          name: c.name,
          studentCode: c.studentCode,
          gradeName: c.gradeName,
        }))}
      />

      {/* ملاحظات المُنشئ الخاصّة عن وليّ الأمر: لمُنشئ حسابه وحده. */}
      {parent.createdById === ctx.session.sub && (
        <div className="mt-5 max-w-xl">
          <CreatorNotesEditor
            endpoint={`/api/admin/parents/${parent.id}`}
            initialNotes={parent.creatorNotes ?? ""}
            about="وليّ الأمر"
          />
        </div>
      )}
    </DashboardShell>
  );
}
