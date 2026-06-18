// src/app/(dashboard)/parent/page.tsx
// لوحة ولي الأمر: قائمة أبنائه ومدخل نتائج كلّ ابن.
import Link from "next/link";
import { redirect } from "next/navigation";
import { getParentSession, getParentChildren } from "@/lib/parent";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

export default async function ParentDashboard() {
  const session = await getParentSession();
  if (!session) redirect("/login");

  const children = await getParentChildren(session.sub);

  return (
    <DashboardShell session={session}>
      <h2 className="mb-4 font-display text-xl font-bold">أبنائي</h2>

      {children.length === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا أبناء مرتبطون بحسابك بعد. تواصل مع إدارة المؤسّسة.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {children.map((c) => (
            <Link
              key={c.id}
              href={`/parent/students/${c.id}`}
              className="card flex flex-col p-5 transition hover:border-primary/40"
            >
              <h3 className="font-display text-lg font-semibold">{c.name}</h3>
              <p className="mt-1 flex flex-wrap gap-2 text-sm text-ink/60">
                {c.gradeName && <span>{c.gradeName}</span>}
                {c.studentCode && (
                  <span className="text-ink/40" dir="ltr">
                    {c.studentCode}
                  </span>
                )}
              </p>
              <span className="mt-3 text-sm text-primary">عرض النتائج ←</span>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
