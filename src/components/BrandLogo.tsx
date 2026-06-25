// src/components/BrandLogo.tsx
// شعار إتقان — حلزون دنا ذهبي على حجر داكن. مقاس قابل للضبط.
export default function BrandLogo({ size = 40 }: { size?: number }) {
  const r = Math.round(18 * (size / 80));
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        overflow: "hidden",
        border: "1px solid #2A2420",
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 80 80" width={size} height={size}>
        <rect width="80" height="80" fill="#171411" />
        {/* الخيط الخلفي (أكتم) */}
        <path
          d="M 52,8 C 52,16 28,16 28,24 C 28,32 52,32 52,40 C 52,48 28,48 28,56 C 28,64 52,64 52,72"
          fill="none"
          stroke="#C49030"
          strokeWidth="2.2"
          strokeLinecap="round"
          opacity={0.5}
        />
        {/* الخيط الأمامي (ذهبي) */}
        <path
          d="M 28,8 C 28,16 52,16 52,24 C 52,32 28,32 28,40 C 28,48 52,48 52,56 C 52,64 28,64 28,72"
          fill="none"
          stroke="#E2B038"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* جسور القواعد */}
        <line x1="28" y1="8"  x2="52" y2="8"  stroke="#D4A838" strokeWidth="1.5" opacity={0.72} />
        <line x1="28" y1="24" x2="52" y2="24" stroke="#D4A838" strokeWidth="1.2" opacity={0.50} />
        <line x1="28" y1="40" x2="52" y2="40" stroke="#D4A838" strokeWidth="1.5" opacity={0.72} />
        <line x1="28" y1="56" x2="52" y2="56" stroke="#D4A838" strokeWidth="1.2" opacity={0.50} />
        <line x1="28" y1="72" x2="52" y2="72" stroke="#D4A838" strokeWidth="1.5" opacity={0.72} />
      </svg>
    </div>
  );
}
