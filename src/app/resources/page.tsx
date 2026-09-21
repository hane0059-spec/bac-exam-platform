// src/app/resources/page.tsx
// صفحة عامّة (بلا تسجيل دخول): «أسئلة وإثراء» — ملفّات PDF للتدرّب حسب الصفّ.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import { formatFileSize } from "@/lib/resources";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const branding = await getBranding();
  return { title: `أسئلة وإثراء — ${branding.name}` };
}

export default async function ResourcesPage() {
  const [branding, gradeLevels] = await Promise.all([
    getBranding(),
    prisma.gradeLevel.findMany({
      orderBy: { orderNum: "asc" },
      include: {
        enrichmentFiles: {
          orderBy: { createdAt: "desc" },
          select: { id: true, title: true, sizeBytes: true, createdAt: true },
        },
      },
    }),
  ]);

  const totalFiles = gradeLevels.reduce(
    (n, g) => n + g.enrichmentFiles.length,
    0,
  );

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/login" className="flex items-center gap-2.5">
          <BrandLogo size={40} hasLogo={branding.hasLogo} />
          <span className="font-display text-lg font-bold">{branding.name}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-xl border border-line px-3 py-2 text-sm font-medium hover:bg-ink/5"
          >
            تسجيل الدخول
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold">أسئلة وإثراء</h1>
        <p className="mt-2 text-ink/60">
          ملفّات PDF للتدرّب — حمّلها على جهازك مجاناً بلا حاجة لحساب.
        </p>
      </div>

      {totalFiles === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا توجد ملفّات متاحة حالياً. عُد لاحقاً.
        </div>
      ) : (
        <div className="space-y-6">
          {gradeLevels
            .filter((g) => g.enrichmentFiles.length > 0)
            .map((g) => (
              <section key={g.id} className="card p-5">
                <h2 className="mb-3 font-display text-lg font-semibold">
                  {g.name}
                  <span className="mr-2 text-sm font-normal text-ink/50">
                    ({g.enrichmentFiles.length} ملفّ)
                  </span>
                </h2>
                <ul className="space-y-2">
                  {g.enrichmentFiles.map((f) => (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span aria-hidden>📄</span>
                        <span className="truncate text-sm font-medium">
                          {f.title}
                        </span>
                        <span className="shrink-0 text-xs text-ink/45">
                          {formatFileSize(f.sizeBytes)}
                        </span>
                      </span>
                      <a
                        href={`/api/resources/${f.id}`}
                        className="shrink-0 rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-light"
                      >
                        تنزيل
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </main>
  );
}
