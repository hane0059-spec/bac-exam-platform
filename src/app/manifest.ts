// src/app/manifest.ts
// بيان التطبيق (PWA): يتيح «تثبيت التطبيق» على الشاشة الرئيسية. الاسم من هوية المنصّة.
import type { MetadataRoute } from "next";
import { getBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const b = await getBranding().catch(() => null);
  const name = b?.name || "إتقان";
  return {
    name,
    short_name: name.length > 12 ? name.slice(0, 12) : name,
    description: b?.tagline || "منصة التقييم والتمكّن",
    start_url: "/",
    scope: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    background_color: "#171411",
    theme_color: "#171411",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
