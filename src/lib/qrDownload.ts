// src/lib/qrDownload.ts
// تنزيل رمز QR كصورة PNG (متوافقة مع الطباعة ومعارض الصور ومشاركتها بين
// الهواتف — بخلاف SVG التي لا تُعرَض بشكل طبيعي في أغلب معارض الصور
// وتطبيقات المراسلة). يعمل في المتصفّح فقط (canvas/Image).
import { qrSvgString } from "@/lib/qr";

export interface QrCaption {
  /** النصّ المكتوب أسفل الرمز (اسم المنصّة). */
  text: string;
  /** قيمة CSS لخطّ النصّ (مثل `var(--font-reem)`)؛ الافتراضي خطّ الصفحة. */
  fontCss?: string;
}

/** يحلّ قيمة font-family كما يراها المتصفّح (تُفكّ متغيّرات CSS) لاستعمالها في canvas. */
function resolveFontFamily(css?: string): string {
  const fallback = "Cairo, Tahoma, sans-serif";
  try {
    const el = document.createElement("span");
    el.style.fontFamily = css || "inherit";
    el.style.position = "absolute";
    el.style.visibility = "hidden";
    document.body.appendChild(el);
    const family = getComputedStyle(el).fontFamily;
    el.remove();
    return family ? `${family}, ${fallback}` : fallback;
  } catch {
    return fallback;
  }
}

export async function downloadQrPng(
  value: string,
  filename: string,
  pixels = 1000,
  caption?: QrCaption,
): Promise<void> {
  const svg = qrSvgString(value, pixels);
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("تعذّر تحويل الرمز"));
      image.src = svgUrl;
    });

    // شريط الاسم أسفل الرمز (اختياري): يُوسَّع القماش به فيبقى الرمز مربّعاً سليماً.
    const band = caption?.text ? Math.round(pixels * 0.17) : 0;
    const canvas = document.createElement("canvas");
    canvas.width = pixels;
    canvas.height = pixels + band;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذّر إنشاء الصورة");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, pixels, pixels);
    if (caption?.text && band) {
      const family = resolveFontFamily(caption.fontCss);
      const size = Math.round(band * 0.56);
      const font = `700 ${size}px ${family}`;
      try {
        await document.fonts.load(font, caption.text);
      } catch {
        /* الارتداد لخطّ النظام كافٍ */
      }
      ctx.font = font;
      ctx.direction = "rtl";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#14532d";
      // يُصغَّر الخطّ إن كان الاسم طويلاً ليبقى داخل عرض الصورة بهامش.
      const maxWidth = pixels * 0.9;
      const w = ctx.measureText(caption.text).width;
      if (w > maxWidth) ctx.font = `700 ${Math.floor((size * maxWidth) / w)}px ${family}`;
      ctx.fillText(caption.text, pixels / 2, pixels + band / 2);
    }

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!pngBlob) throw new Error("تعذّر إنشاء الصورة");

    const pngUrl = URL.createObjectURL(pngBlob);
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(pngUrl);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}
