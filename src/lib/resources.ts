// src/lib/resources.ts
// ملفّات «أسئلة وإثراء» العامّة (بلا تسجيل دخول) — PDF فقط، يرفعها المدير العام.
export const MAX_RESOURCE_BYTES = 15 * 1024 * 1024; // 15MB
export const RESOURCE_MIME = "application/pdf";

/** يتحقّق من ملف مرفوع (PDF فقط، ضمن الحدّ الأقصى). */
export function validateResourceFile(
  file: File,
): { ok: true } | { ok: false; error: string } {
  if (file.type !== RESOURCE_MIME)
    return { ok: false, error: "يُقبل PDF فقط." };
  if (file.size > MAX_RESOURCE_BYTES)
    return { ok: false, error: "حجم الملف يتجاوز 15 ميغابايت." };
  if (file.size === 0) return { ok: false, error: "ملف فارغ." };
  return { ok: true };
}

/**
 * رأس Content-Disposition آمن لاسم ملف قد يحوي عربية/رموزاً خاصّة:
 * fallback ASCII لأمان التوافق + filename* بترميز RFC 5987 للاسم الكامل.
 */
export function formatFileSize(n: number): string {
  if (n < 1024) return `${n} ب`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} ك.ب`;
  return `${(n / (1024 * 1024)).toFixed(1)} م.ب`;
}

export function safeContentDisposition(filename: string): string {
  const fallback =
    filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") ||
    "file.pdf";
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
