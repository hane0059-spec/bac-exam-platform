// src/lib/imageCompress.ts
// ضغط الصور في المتصفّح قبل الرفع: تصغير الأبعاد + إعادة ترميز JPEG.
// يخفّف حجم القاعدة ويسرّع الرفع. PDF وغير الصور تُمرّر كما هي.
export interface PreparedFile {
  file: File;
  width: number | null;
  height: number | null;
  originalBytes: number;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("تعذّر قراءة الصورة"));
    img.src = url;
  });
}

function fit(
  w: number,
  h: number,
  maxDim: number,
): { width: number; height: number } {
  if (w <= maxDim && h <= maxDim) return { width: w, height: h };
  const scale = maxDim / Math.max(w, h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

function renameJpeg(name: string): string {
  return name.replace(/\.[^.]+$/, "") + ".jpg";
}

/** يجهّز ملفاً للرفع: يضغط الصور، ويمرّر PDF كما هو. لا يرمي أبداً. */
export async function prepareUpload(
  file: File,
  opts: { maxDim?: number; quality?: number } = {},
): Promise<PreparedFile> {
  const originalBytes = file.size;
  if (file.type === "application/pdf" || !file.type.startsWith("image/")) {
    return { file, width: null, height: null, originalBytes };
  }

  const maxDim = opts.maxDim ?? 1600;
  const quality = opts.quality ?? 0.72;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const { width, height } = fit(img.naturalWidth, img.naturalHeight, maxDim);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, width, height, originalBytes };
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", quality),
    );
    if (!blob) return { file, width, height, originalBytes };
    // أبقِ الأصغر (الصور الصغيرة أصلاً قد تكبر بإعادة الترميز).
    const out =
      blob.size < file.size
        ? new File([blob], renameJpeg(file.name), { type: "image/jpeg" })
        : file;
    return { file: out, width, height, originalBytes };
  } catch {
    return { file, width: null, height: null, originalBytes };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} ب`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} ك.ب`;
  return `${(n / (1024 * 1024)).toFixed(1)} م.ب`;
}
