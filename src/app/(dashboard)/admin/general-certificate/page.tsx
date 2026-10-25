// src/app/(dashboard)/admin/general-certificate/page.tsx
// المدير: شهادة عامّة فارغة يعبّئها بنفسه (لأيّ اسم/جهة/سبب) بنماذج إطار متعدّدة ← PNG/PDF/طباعة.
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin";
import { getBranding } from "@/lib/branding";
import { roleLabel } from "@/lib/gender";
import DashboardShell from "@/components/DashboardShell";
import GeneralCertificateMaker from "@/components/teacher/GeneralCertificateMaker";

export const dynamic = "force-dynamic";

export default async function AdminGeneralCertificatePage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/login");

  const [me, brand] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.session.sub },
      select: { firstName: true, lastName: true, gender: true, school: { select: { name: true } } },
    }),
    getBranding(),
  ]);
  if (!me) redirect("/login");

  return (
    <DashboardShell session={ctx.session}>
      <div className="mb-6">
        <Link href="/admin" className="text-base font-semibold text-red-800 hover:text-red-900 hover:underline">
          ← لوحتي
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">شهادة عامّة</h2>
        <p className="mt-1 text-sm text-ink/60">
          شهادة فارغة تعبّئها بنفسك: اسم المُكرَّم، الجهة، سبب المنح، شارة اختيارية، التاريخ والموقِّع — واختر
          النموذج المناسب (بينها زخارف إسلامية وأنماط عالمية).
        </p>
      </div>
      <GeneralCertificateMaker
        defaultOrg={me.school?.name ?? brand.name}
        defaultSigner={`${me.firstName} ${me.lastName}`}
        defaultSignerTitle={roleLabel("ADMIN", me.gender)}
      />
    </DashboardShell>
  );
}
