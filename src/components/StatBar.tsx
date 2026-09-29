// src/components/StatBar.tsx
// شريط إحصاءات مشترك للوحات الرئيسية — أرقام مشتقّة من البيانات الحالية (عرضيّ فقط).
import { Icon, type IconName } from "./icons";

export interface Stat {
  label: string;
  value: string | number;
  tone?: "default" | "primary" | "gold" | "muted";
  icon?: IconName;
}

const TONE: Record<NonNullable<Stat["tone"]>, string> = {
  default: "text-ink",
  primary: "text-primary",
  gold: "text-gold",
  muted: "text-ink/50",
};

const ICON_WRAP: Record<NonNullable<Stat["tone"]>, string> = {
  default: "bg-ink/5 text-ink/60",
  primary: "bg-primary-light text-primary",
  gold: "bg-gold/15 text-gold",
  muted: "bg-ink/5 text-ink/40",
};

export default function StatBar({ stats }: { stats: Stat[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s, i) => {
        const tone = s.tone ?? "default";
        return (
          <div
            key={i}
            className="card flex flex-col items-center justify-center gap-1.5 px-3 py-4 text-center"
          >
            {s.icon && (
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full sm:h-10 sm:w-10 ${ICON_WRAP[tone]}`}
              >
                <Icon name={s.icon} className="h-5 w-5" />
              </span>
            )}
            <span className={`font-display text-2xl font-bold leading-none ${TONE[tone]}`}>
              {s.value}
            </span>
            <span className="text-xs leading-tight text-ink/60">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}
