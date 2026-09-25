// src/app/resources/page.tsx
// صفحة عامّة (بلا تسجيل دخول): «أسئلة وإثراء» — لوحة إعلانات لكل صفّ:
// منشورات نصّية، صور، وملفّات PDF/Word للتنزيل.
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import { formatFileSize, kindOfMime } from "@/lib/resources";
import Linkify from "@/components/Linkify";
import BrandLogo from "@/components/BrandLogo";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const branding = await getBranding();
  return { title: `أسئلة وإثراء — ${branding.name}` };
}

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("ar", { dateStyle: "medium" }).format(d);

export default async function ResourcesPage() {
  const [branding, gradeLevels] = await Promise.all([
    getBranding(),
    prisma.gradeLevel.findMany({
      orderBy: { orderNum: "asc" },
      include: {
        enrichmentFiles: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            kind: true,
            body: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const totalItems = gradeLevels.reduce((n, g) => n + g.enrichmentFiles.length, 0);

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
          إعلانات وصور وملفّات (PDF / Word) للتدرّب — مجاناً وبلا حاجة لحساب.
        </p>
      </div>

      {totalItems === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا محتوى متاح حالياً. عُد لاحقاً.
        </div>
      ) : (
        <div className="space-y-6">
          {gradeLevels
            .filter((g) => g.enrichmentFiles.length > 0)
            .map((g) => {
              const items = g.enrichmentFiles.map((f) => ({
                ...f,
                k: kindOfMime(f.mimeType, f.kind),
              }));
              const posts = items.filter((i) => i.k === "text");
              const images = items.filter((i) => i.k === "image");
              const docs = items.filter((i) => i.k === "pdf" || i.k === "word");
              return (
                <section key={g.id} className="card space-y-4 p-5">
                  <h2 className="font-display text-lg font-semibold">{g.name}</h2>

                  {posts.length > 0 && (
                    <div className="space-y-3">
                      {posts.map((p) => (
                        <article
                          key={p.id}
                          className="rounded-xl border border-gold/40 bg-gold/5 p-4"
                        >
                          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="font-display font-semibold">📌 {p.title}</h3>
                            <span className="text-xs text-ink/45">{fmtDate(p.createdAt)}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/80">
                            <Linkify text={p.body ?? ""} />
                          </p>
                        </article>
                      ))}
                    </div>
                  )}

                  {images.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {images.map((im) => (
                        <figure key={im.id} className="overflow-hidden rounded-xl border border-line">
                          <a
                            href={`/api/resources/${im.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="افتح الصورة بحجمها الكامل"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/resources/${im.id}`}
                              alt={im.title}
                              loading="lazy"
                              className="h-40 w-full object-cover"
                            />
                          </a>
                          <figcaption className="flex items-center justify-between gap-2 p-2 text-xs">
                            <span className="truncate text-ink/70">{im.title}</span>
                            <a
                              href={`/api/resources/${im.id}?dl=1`}
                              className="shrink-0 text-primary hover:underline"
                            >
                              تنزيل
                            </a>
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  )}

                  {docs.length > 0 && (
                    <ul className="space-y-2">
                      {docs.map((f) => (
                        <li
                          key={f.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2.5"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span aria-hidden>{f.k === "word" ? "📝" : "📄"}</span>
                            <span className="truncate text-sm font-medium">{f.title}</span>
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
                  )}
                </section>
              );
            })}
        </div>
      )}
    </main>
  );
}
