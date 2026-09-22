// src/lib/qrDownload.ts
// تنزيل رمز QR كصورة PNG (متوافقة مع الطباعة ومعارض الصور ومشاركتها بين
// الهواتف — بخلاف SVG التي لا تُعرَض بشكل طبيعي في أغلب معارض الصور
// وتطبيقات المراسلة). يعمل في المتصفّح فقط (canvas/Image).
import { qrSvgString } from "@/lib/qr";

export async function downloadQrPng(
  value: string,
  filename: string,
  pixels = 1000,
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

    const canvas = document.createElement("canvas");
    canvas.width = pixels;
    canvas.height = pixels;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("تعذّر إنشاء الصورة");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, pixels, pixels);
    ctx.drawImage(img, 0, 0, pixels, pixels);

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
