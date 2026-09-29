// src/components/icons.tsx
// أيقونات هندسية بسيطة مشتركة (خطوط، بلا اعتماد على مكتبة خارجية) — تُستخدَم في
// StatBar وIconBadge لتوحيد الشكل البصري عبر كل اللوحات.
export type IconName =
  | "users"
  | "check"
  | "clock"
  | "alert"
  | "chart"
  | "book"
  | "cap"
  | "star"
  | "flag"
  | "mail"
  | "shield"
  | "calculator"
  | "upload"
  | "layers"
  | "family"
  | "folder"
  | "gear"
  | "teach";

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  switch (name) {
    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19c.6-3 2.7-4.5 5.5-4.5s4.9 1.5 5.5 4.5" />
          <circle cx="17" cy="8.5" r="2.3" />
          <path d="M15.5 14.7c2.2.4 3.6 1.8 4 3.8" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <path d="M8.5 12.5l2.3 2.3L16 9.5" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.2" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "alert":
      return (
        <svg {...common}>
          <path d="M12 4 21 19H3L12 4Z" />
          <path d="M12 10.5v3.3" />
          <circle cx="12" cy="16.7" r="0.15" fill="currentColor" stroke="none" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M5 19V11" />
          <path d="M12 19V6" />
          <path d="M19 19v-6" />
        </svg>
      );
    case "book":
      return (
        <svg {...common}>
          <path d="M12 6.2c-1.6-1.4-3.7-2-6.5-1.7v13c2.8-.3 4.9.3 6.5 1.7 1.6-1.4 3.7-2 6.5-1.7v-13c-2.8-.3-4.9.3-6.5 1.7Z" />
          <path d="M12 6.2v13" />
        </svg>
      );
    case "cap":
      return (
        <svg {...common}>
          <path d="M12 5 21 9.5 12 14 3 9.5 12 5Z" />
          <path d="M7 11.5v4c0 1.2 2.2 2.3 5 2.3s5-1.1 5-2.3v-4" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M12 4.5 14 9.7l5.5.4-4.3 3.6 1.4 5.4L12 16.3l-4.6 2.8 1.4-5.4-4.3-3.6 5.5-.4L12 4.5Z" />
        </svg>
      );
    case "flag":
      return (
        <svg {...common}>
          <path d="M6 4v16" />
          <path d="M6 5.5c2-1 4 1 6.5.5s3-1.5 5-1v8c-2.5.5-3.5 1.5-5 1S8 12.5 6 13.5" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="M4.5 6.5 12 12.5l7.5-6" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 4 19 6.5v5.5c0 4-3 6.7-7 8-4-1.3-7-4-7-8V6.5L12 4Z" />
          <path d="M12 4v13.7" opacity={0.55} />
        </svg>
      );
    case "calculator":
      return (
        <svg {...common}>
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <path d="M8 7.5h8" />
          <path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
        </svg>
      );
    case "upload":
      return (
        <svg {...common}>
          <path d="M12 15V5" />
          <path d="M8.5 8.5 12 5l3.5 3.5" />
          <path d="M5 15v2.5c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V15" />
        </svg>
      );
    case "layers":
      return (
        <svg {...common}>
          <path d="M12 4 20 8.5 12 13 4 8.5 12 4Z" />
          <path d="M4 13.2 12 17.7l8-4.5" />
        </svg>
      );
    case "family":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="3" />
          <path d="M3 19c.5-3 2.5-4.5 5-4.5s4.5 1.5 5 4.5" />
          <circle cx="17.5" cy="10.5" r="2" />
          <path d="M14.8 15c1.8.4 3 1.7 3.4 3.8" />
        </svg>
      );
    case "folder":
      return (
        <svg {...common}>
          <path d="M4 6.5c0-.6.4-1 1-1h4.5l1.5 2H19c.6 0 1 .4 1 1v9.5c0 .6-.4 1-1 1H5c-.6 0-1-.4-1-1V6.5Z" />
        </svg>
      );
    case "gear":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 3.5v2.3M12 18.2v2.3M20.5 12h-2.3M5.8 12H3.5M17.8 6.2l-1.6 1.6M7.8 16.2l-1.6 1.6M17.8 17.8l-1.6-1.6M7.8 7.8 6.2 6.2" />
        </svg>
      );
    case "teach":
      return (
        <svg {...common}>
          <rect x="3.5" y="4" width="17" height="12" rx="1.6" />
          <path d="M7 20h10" />
          <path d="M12 16v4" />
          <path d="M7.5 12.3 10 9.7l2 1.8 3.5-3.6" />
        </svg>
      );
  }
}
