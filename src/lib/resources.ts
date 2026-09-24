// src/lib/resources.ts
// «أسئلة وإثراء» العامّة (بلا تسجيل دخول): لوحة إعلانات لكل صفّ — ملفّات PDF/Word
// وصور ومنشورات نصّية، يديرها المدير العام. آمن للعميل (بلا prisma).

export type ResourceKind = "pdf" | "image" | "word" | "text";

interface TypeRule {
  kind: Exclude<ResourceKind, "text">;
  maxBytes: number;
  /** التحقّق من بداية الملفّ الفعلية (لا الامتداد ولا نوع المتصفّح فقط). */
  sig: (b: Uint8Array) => boolean;
  ext: string[];
}

const MB = 1024 * 1024;
const startsWith = (b: Uint8Array, bytes: number[]) =>
  bytes.every((v, i) => b[i] === v);

const RULES: Record<string, TypeRule> = {
  "application/pdf": {
    kind: "pdf", maxBytes: 15 * MB, ext: ["pdf"],
    sig: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]),
  },
  "image/jpeg": {
    kind: "image", maxBytes: 5 * MB, ext: ["jpg", "jpeg"],
    sig: (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  },
  "image/png": {
    kind: "image", maxBytes: 5 * MB, ext: ["png"],
    sig: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47]),
  },
  "image/webp": {
    kind: "image", maxBytes: 5 * MB, ext: ["webp"],
    sig: (b) =>
      startsWith(b, [0x52, 0x49, 0x46, 0x46]) &&
      startsWith(b.subarray(8), [0x57, 0x45, 0x42, 0x50]),
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    kind: "word", maxBytes: 15 * MB, ext: ["docx"],
    sig: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
  },
  "application/msword": {
    kind: "word", maxBytes: 15 * MB, ext: ["doc"],
    sig: (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0]),
  },
};

export const RESOURCE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.docx,.doc," +
  "application/pdf,image/jpeg,image/png,image/webp," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword";

export const MAX_POST_BODY = 5000;
export const MAX_TITLE = 200;

/** يحدّد نوع MIME المعتمد من نوع المتصفّح أو الامتداد (المتصفّحات تُخطئ في Word أحياناً). */
export function resolveResourceMime(name: string, type: string): string | null {
  if (RULES[type]) return type;
  const ext = name.toLowerCase().split(".").pop() ?? "";
  for (const [mime, r] of Object.entries(RULES)) if (r.ext.includes(ext)) return mime;
  return null;
}

/** تحقّق نقيّ: النوع مقبول، الحجم ضمن الحدّ، وبداية الملفّ تطابق النوع. */
export function validateResourceBytes(
  mime: string | null,
  size: number,
  head: Uint8Array,
): { ok: true; mime: string; kind: ResourceKind } | { ok: false; error: string } {
  if (!mime || !RULES[mime])
    return { ok: false, error: "النوع غير مدعوم (PDF أو Word أو صورة JPG/PNG/WebP)." };
  const rule = RULES[mime];
  if (size === 0) return { ok: false, error: "ملف فارغ." };
  if (size > rule.maxBytes)
    return { ok: false, error: `حجم الملف يتجاوز ${rule.maxBytes / MB} ميغابايت لهذا النوع.` };
  if (!rule.sig(head))
    return { ok: false, error: "محتوى الملفّ لا يطابق نوعه." };
  return { ok: true, mime, kind: rule.kind };
}

/** نوع العرض من MIME المخزَّن؛ المنشور النصّي kind=TEXT. */
export function kindOfMime(mime: string, kindField?: string): ResourceKind {
  if (kindField === "TEXT") return "text";
  return RULES[mime]?.kind ?? "pdf";
}

export function formatFileSize(n: number): string {
  if (n < 1024) return `${n} ب`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} ك.ب`;
  return `${(n / (1024 * 1024)).toFixed(1)} م.ب`;
}

/**
 * رأس Content-Disposition آمن لاسم ملف قد يحوي عربية/رموزاً خاصّة:
 * fallback ASCII لأمان التوافق + filename* بترميز RFC 5987 للاسم الكامل.
 */
export function safeContentDisposition(
  filename: string,
  disposition: "attachment" | "inline" = "attachment",
): string {
  const fallback =
    filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "file";
  const encoded = encodeURIComponent(filename);
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
