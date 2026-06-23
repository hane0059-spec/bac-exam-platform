// src/components/StatBar.tsx
// شريط إحصاءات مشترك للوحات الرئيسية — أرقام مشتقّة من البيانات الحالية (عرضيّ فقط).
export interface Stat {
  label: string;
  value: string | number;
  tone?: "default" | "primary" | "gold" | "muted";
}

const TONE: Record<NonNullable<Stat["tone"]>, string> = {
  default: "text-ink",
  primary: "text-primary",
  gold: "text-gold",
  muted: "text-ink/50",
};

export default function StatBar({ stats }: { stats: Stat[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s, i) => (
        <div
          key={i}
          className="card flex flex-col items-center justify-center px-3 py-4 text-center"
        >
          <span
            className={`font-display text-2xl font-bold leading-none ${
              TONE[s.tone ?? "default"]
            }`}
          >
            {s.value}
          </span>
          <span className="mt-1.5 text-xs leading-tight text-ink/60">
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
