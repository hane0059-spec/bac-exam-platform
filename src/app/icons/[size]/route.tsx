// src/app/icons/[size]/route.tsx
// أيقونة التطبيق PNG (حلزون الدنا الذهبي على خلفية داكنة، بهامش آمن للأيقونات المقنَّعة).
import { ImageResponse } from "next/og";

export const runtime = "edge";

const SIZES = new Set([180, 192, 512]);

export async function GET(_req: Request, { params }: { params: { size: string } }) {
  const size = Number(params.size);
  if (!SIZES.has(size)) return new Response("Not found", { status: 404 });
  const inner = Math.round(size * 0.66);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#171411",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg viewBox="0 0 80 80" width={inner} height={inner}>
          <path
            d="M 52,8 C 52,16 28,16 28,24 C 28,32 52,32 52,40 C 52,48 28,48 28,56 C 28,64 52,64 52,72"
            fill="none"
            stroke="#C49030"
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity={0.55}
          />
          <path
            d="M 28,8 C 28,16 52,16 52,24 C 52,32 28,32 28,40 C 28,48 52,48 52,56 C 52,64 28,64 28,72"
            fill="none"
            stroke="#E2B038"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <line x1="28" y1="8" x2="52" y2="8" stroke="#D4A838" strokeWidth="1.8" opacity={0.75} />
          <line x1="28" y1="24" x2="52" y2="24" stroke="#D4A838" strokeWidth="1.5" opacity={0.55} />
          <line x1="28" y1="40" x2="52" y2="40" stroke="#D4A838" strokeWidth="1.8" opacity={0.75} />
          <line x1="28" y1="56" x2="52" y2="56" stroke="#D4A838" strokeWidth="1.5" opacity={0.55} />
          <line x1="28" y1="72" x2="52" y2="72" stroke="#D4A838" strokeWidth="1.8" opacity={0.75} />
        </svg>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    }
  );
}
