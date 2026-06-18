// src/app/guide/[role]/page.tsx
// دليل استخدام مخصّص لكل دور (يُفتح في تبويب جديد من رأس اللوحة).
import { notFound } from "next/navigation";
import { GUIDES, type GuideRole } from "@/lib/guide";

export const dynamic = "force-static";

const ROLES: GuideRole[] = ["student", "teacher", "admin", "parent"];

export function generateStaticParams() {
  return ROLES.map((role) => ({ role }));
}

export default function GuidePage({ params }: { params: { role: string } }) {
  if (!ROLES.includes(params.role as GuideRole)) notFound();
  const guide = GUIDES[params.role as GuideRole];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 border-b border-line pb-5">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white">
          ع
        </div>
        <h1 className="font-display text-2xl font-bold">{guide.title}</h1>
        <p className="mt-2 text-ink/60">{guide.intro}</p>
      </header>

      <div className="space-y-6">
        {guide.sections.map((s, i) => (
          <section key={i} className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display font-semibold">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-light text-sm text-primary-dark">
                {i + 1}
              </span>
              {s.title}
            </h2>
            <ul className="space-y-2">
              {s.items.map((it, j) => (
                <li key={j} className="flex gap-2 text-sm leading-relaxed text-ink/80">
                  <span className="mt-1 text-primary" aria-hidden>
                    •
                  </span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-ink/40">
        لإغلاق الدليل، أغلق هذا التبويب وعُد إلى لوحتك.
      </p>
    </main>
  );
}
