// src/components/icons/FamilyIcon.tsx
// أيقونة عائلة محتشمة (أب، أمّ بحجاب، طفل) — بديل «👪» في نافذة دخول
// أولياء الأمور. لون واحد يرث currentColor (يتوافق مع الوضع الليلي).
export default function FamilyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      className={className}
      role="img"
      aria-label="عائلة"
    >
      {/* الأب */}
      <circle cx="24" cy="28" r="10" />
      <path d="M24 42c-11 0-19 8-19 20v8h38v-8c0-12-8-20-19-20z" />

      {/* الأمّ (حجاب) */}
      <path d="M76 12c-14 0-23 10-23 23 0 3 .4 5.5 1.1 8h43.8c.7-2.5 1.1-5 1.1-8 0-13-9-23-23-23z" />
      <circle cx="76" cy="30" r="9" />
      <path d="M76 44c-16 0-27 12-27 28v8h54v-8c0-16-11-28-27-28z" />

      {/* الطفل */}
      <circle cx="50" cy="56" r="7" />
      <path d="M50 65c-8 0-14 6-14 15v4h28v-4c0-9-6-15-14-15z" />
    </svg>
  );
}
