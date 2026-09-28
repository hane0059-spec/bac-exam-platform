// src/app/(dashboard)/student/enrichment/page.tsx
// الطالب: «أسئلة وإثراء» مدرّسيه — محتوى المدرّسين المسجَّل عندهم فقط (وفعّل المدير لهم الخاصّية).
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { enrichmentTeacherIdsForStudent } from "@/lib/enrichment";
import { formatFileSize, kindOfMime } from "@/lib/resources";
import DashboardShell from "@/components/DashboardShell";
import Linkify from "@/components/Linkify";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("ar", { dateStyle: "medium" }).format(d);

export default async function StudentEnrichmentPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "STUDENT") redirect("/");

  const teacherIds = await enrichmentTeacherIdsForStudent(session.sub);
  const files = teacherIds.length
    ? await prisma.enrichmentFile.findMany({
        where: { teacherId: { in: teacherIds } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          kind: true,
          body: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
          teacherId: true,
          teacher: { select: { firstName: true, lastName: true } },
        },
      })
    : [];

  // تجميع حسب المدرّس.
  const byTeacher = new Map<string, { name: string; items: typeof files }>();
  for (const f of files) {
    const id = f.teacherId!;
    if (!byTeacher.has(id))
      byTeacher.set(id, {
        name: `${f.teacher!.firstName} ${f.teacher!.lastName}`,
        items: [],
      });
    byTeacher.get(id)!.items.push(f);
  }

  return (
    <DashboardShell session={session}>
      <div className="mb-6">
        <Link href="/student" className="text-base font-semibold text-red-800 hover:text-red-900 hover:underline">
          ← لوحتي
        </Link>
        <h2 className="mt-2 font-display text-xl font-bold">أسئلة وإثراء</h2>
        <p className="mt-1 text-sm text-ink/60">
          مواد إضافية ينشرها لك مدرّسوك. لا يراها غيرُ طلابهم المسجّلين.
        </p>
      </div>

      {byTeacher.size === 0 ? (
        <div className="card p-8 text-center text-ink/60">
          لا محتوى منشوراً من مدرّسيك حتى الآن.
        </div>
      ) : (
        <div className="space-y-6">
          {[...byTeacher.entries()].map(([tid, t]) => {
            const items = t.items.map((f) => ({
              ...f,
              k: kindOfMime(f.mimeType, f.kind),
            }));
            const posts = items.filter((i) => i.k === "text");
            const images = items.filter((i) => i.k === "image");
            const docs = items.filter((i) => i.k === "pdf" || i.k === "word");
            return (
              <section key={tid} className="card space-y-4 p-5">
                <h3 className="font-display text-lg font-semibold">{t.name}</h3>

                {posts.map((p) => (
                  <article
                    key={p.id}
                    className="rounded-xl border border-gold/40 bg-gold/5 p-4"
                  >
                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="font-display font-semibold">📌 {p.title}</h4>
                      <span className="text-xs text-ink/45">{fmtDate(p.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink/80">
                      <Linkify text={p.body ?? ""} />
                    </p>
                  </article>
                ))}

                {images.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {images.map((im) => (
                      <figure key={im.id} className="overflow-hidden rounded-xl border border-line">
                        <a
                          href={`/api/resources/${im.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
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
    </DashboardShell>
  );
}
