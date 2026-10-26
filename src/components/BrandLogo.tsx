// src/components/BrandLogo.tsx
// شعار المنصّة: صورة مرفوعة من المدير العام (عند وجودها) وإلا الشعار الافتراضي «إتقان»
// (قبّعة التخرّج + الكتاب + ورقة الاختبار، من public/brand/emblem.png) على بلاط أبيض ليُقرأ في الوضعين.
export default function BrandLogo({
  size = 40,
  hasLogo = false,
}: {
  size?: number;
  hasLogo?: boolean;
}) {
  const r = Math.round(18 * (size / 80));
  const custom = hasLogo;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        overflow: "hidden",
        border: custom ? "1px solid #2A2420" : "1px solid rgba(0,0,0,0.12)",
        background: custom ? undefined : "#FFFFFF",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={custom ? "/api/branding/logo" : "/brand/emblem.png"}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          objectFit: custom ? "cover" : "contain",
          display: "block",
        }}
      />
    </div>
  );
}
