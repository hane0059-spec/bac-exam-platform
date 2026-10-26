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
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
