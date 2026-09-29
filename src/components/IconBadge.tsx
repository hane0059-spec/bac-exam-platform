// src/components/IconBadge.tsx
// شارة أيقونة دائرية ملوّنة — لعناوين بطاقات الروابط في اللوحات (عرضيّ فقط).
import { Icon, type IconName } from "./icons";

const WRAP: Record<"primary" | "gold" | "muted", string> = {
  primary: "bg-primary-light text-primary",
  gold: "bg-gold/15 text-gold",
  muted: "bg-ink/5 text-ink/60",
};

export default function IconBadge({
  icon,
  tone = "primary",
}: {
  icon: IconName;
  tone?: "primary" | "gold" | "muted";
}) {
  return (
    <span
      className={`mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl ${WRAP[tone]}`}
    >
      <Icon name={icon} className="h-5 w-5" />
    </span>
  );
}
