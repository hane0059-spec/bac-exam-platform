// src/components/student/BadgeGrid.tsx
// عرض شارات الإنجاز: المحقَّقة ملوّنة، والمقفلة باهتة مع تقدّمها نحو الاستحقاق.
import type { Badge } from "@/lib/badges";

export default function BadgeGrid({ badges }: { badges: Badge[] }) {
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="card mb-5 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold">شارات الإنجاز</h3>
        <span className="text-sm font-medium text-gold">
          {earnedCount} / {badges.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`flex flex-col items-center rounded-xl border p-3 text-center ${
              b.earned
                ? "border-gold/40 bg-gold/10"
                : "border-line bg-ink/5 opacity-70"
            }`}
          >
            <span
              className={`text-3xl leading-none ${b.earned ? "" : "grayscale"}`}
              aria-hidden
            >
              {b.icon}
            </span>
            <span
              className={`mt-2 text-sm font-semibold ${
                b.earned ? "text-ink" : "text-ink/60"
              }`}
            >
              {b.title}
            </span>
            <span className="mt-0.5 text-xs leading-tight text-ink/50">
              {b.description}
            </span>
            {b.earned ? (
              <span className="mt-1.5 text-xs font-bold text-gold">
                ✓ مُحقَّقة
              </span>
            ) : (
              b.target != null && (
                <span className="mt-1.5 text-xs font-medium text-ink/40">
                  {b.current ?? 0} / {b.target}
                </span>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
