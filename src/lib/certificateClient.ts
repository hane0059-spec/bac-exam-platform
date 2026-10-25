// src/lib/certificateClient.ts
// أدوات الشهادة التي تعمل في المتصفّح فقط (خطوط/تنزيل/قراءة الأسلوب المحفوظ على الجهاز).
import { CERT_H, CERT_W } from "@/lib/certificateArt";
import { jpegToPdf } from "@/lib/pdfImage";
import { printHtmlInHiddenFrame } from "@/lib/printHtml";
import {
  DEFAULT_FLAG_COLORS,
  EMBLEMS,
  themeById,
  type CertFonts,
  type CertThemeId,
  type EmblemId,
} from "@/lib/certificateArt";

function familyOf(cssVar: string, fallback: string): string {
  const el = document.createElement("span");
  el.style.fontFamily = `var(${cssVar})`;
  el.style.position = "absolute";
  el.style.visibility = "hidden";
  document.body.appendChild(el);
  const f = getComputedStyle(el).fontFamily;
  el.remove();
  return f && !f.includes("var(") ? `${f}, ${fallback}` : fallback;
}

let fontsPromise: Promise<CertFonts> | null = null;

/** يحلّ عائلتَي الخطّ المضمّنتين (Reem Kufi / Amiri) ويحمّلهما قبل الرسم على canvas (مرّة واحدة). */
export function loadCertFonts(): Promise<CertFonts> {
  if (!fontsPromise) fontsPromise = resolveCertFonts();
  return fontsPromise;
}

async function resolveCertFonts(): Promise<CertFonts> {
  const fonts: CertFonts = {
    title: familyOf("--font-reem", "'Reem Kufi', Tahoma, sans-serif"),
    body: familyOf("--font-amiri", "Amiri, 'Traditional Arabic', serif"),
  };
  try {
    await Promise.all([
      document.fonts.load(`700 80px ${fonts.title}`, "شهادة تقدير مشاركة إتقان 0123456789%"),
      document.fonts.load(`400 40px ${fonts.body}`, "الطالب تتشرف بمنح هذه الشهادة"),
      document.fonts.load(`700 40px ${fonts.body}`, "الطالب المدرس"),
    ]);
    await document.fonts.ready;
  } catch {
    // الخطوط الاحتياطية تكفي.
  }
  return fonts;
}

export function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").trim().slice(0, 60) || "شهادة";
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("تعذّر إنشاء الملفّ"))), type, quality)
  );
}

export interface SavedCertStyle {
  themeId: CertThemeId;
  flagColors: [string, string, string];
  emblem: EmblemId | null;
  logoImage: HTMLImageElement | null;
}

/** الأسلوب المحفوظ على هذا الجهاز من آخر مرّة (النموذج/ألوان العلم/الشعار). */
export async function readSavedCertStyle(): Promise<SavedCertStyle> {
  const style: SavedCertStyle = {
    themeId: "emerald",
    flagColors: DEFAULT_FLAG_COLORS,
    emblem: null,
    logoImage: null,
  };
  try {
    const saved = localStorage.getItem("cert-theme");
    if (saved) style.themeId = themeById(saved).id;
    const flag = JSON.parse(localStorage.getItem("cert-flag") ?? "null");
    if (Array.isArray(flag) && flag.length === 3 && flag.every((c) => /^#[0-9a-f]{6}$/i.test(c))) {
      style.flagColors = flag as [string, string, string];
    }
    const em = localStorage.getItem("cert-emblem");
    if (em === "upload") {
      const url = localStorage.getItem("cert-logo");
      if (url) {
        style.logoImage = await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        });
      }
    } else if (em && EMBLEMS.some((e) => e.id === em)) {
      style.emblem = em as EmblemId;
    }
  } catch {
    // التخزين غير متاح — الأسلوب الافتراضي.
  }
  return style;
}

/** تنزيل الـcanvas صورة PNG. */
export async function exportPng(canvas: HTMLCanvasElement, baseName: string): Promise<void> {
  downloadBlob(await canvasBlob(canvas, "image/png"), `${baseName}.png`);
}

/** تنزيل الـcanvas ملفّ PDF (صفحة A4 أفقية). */
export async function exportPdf(canvas: HTMLCanvasElement, baseName: string): Promise<void> {
  const jpeg = new Uint8Array(await (await canvasBlob(canvas, "image/jpeg", 0.93)).arrayBuffer());
  const pdf = jpegToPdf(jpeg, CERT_W, CERT_H);
  downloadBlob(new Blob([pdf as BlobPart], { type: "application/pdf" }), `${baseName}.pdf`);
}

/** طباعة الـcanvas على A4 أفقي. */
export function printCanvas(canvas: HTMLCanvasElement, baseName: string): void {
  const src = canvas.toDataURL("image/jpeg", 0.93);
  printHtmlInHiddenFrame(
    `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${baseName}</title>
<style>@page{size:A4 landscape;margin:0}html,body{margin:0;height:100%}img{display:block;width:100%;height:100%;object-fit:contain}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body><img src="${src}" alt=""></body></html>`
  );
}
