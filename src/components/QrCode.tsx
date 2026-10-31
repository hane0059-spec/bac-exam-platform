"use client";
// src/components/QrCode.tsx
// رمز QR مرسوم كـ SVG (بهامش/منطقة صامتة لقراءة موثوقة)، مع زرّ تنزيل
// اختياري يحوّله PNG — صيغة قابلة للطباعة ومشاركتها بين الهواتف.
import { useState } from "react";
import { qrPath } from "@/lib/qr";
import { displayAddress, downloadQrPng } from "@/lib/qrDownload";

export default function QrCode({
  value,
  size = 140,
  downloadName,
  caption,
  captionFontCss,
  showAddress = false,
  addressText,
}: {
  value: string;
  size?: number;
  /** إن وُجد، يظهر زرّ «تنزيل» يحفظ الرمز بهذا الاسم كملف PNG. */
  downloadName?: string;
  /** اسم يُكتب أسفل الرمز على الشاشة وفي الصورة المنزَّلة (مثل اسم المنصّة). */
  caption?: string;
  /** قيمة CSS لخطّ الاسم (مثل `var(--font-reem)`). */
  captionFontCss?: string;
  /** يكتب عنوان الموقع نصّاً تحت الاسم (على الشاشة وفي الصورة) ليُدخَل يدوياً إن تلف الرمز المطبوع. */
  showAddress?: boolean;
  /** نصّ العنوان المعروض إن اختلف عن الرابط المرمَّز (مثل الجذر دون `/login`). */
  addressText?: string;
}) {
  const { pixels, d } = qrPath(value, size);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    if (!downloadName) return;
    setBusy(true);
    setError("");
    try {
      await downloadQrPng(
        value,
        downloadName,
        1000,
        caption
          ? { text: caption, address: showAddress ? addressText ?? displayAddress(value) : undefined, fontCss: captionFontCss }
          : undefined,
      );
    } catch {
      setError("تعذّر التنزيل، حاول مجدداً.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${pixels} ${pixels}`}
        role="img"
        aria-label="رمز QR"
        className="rounded-lg border border-line"
      >
        <rect width={pixels} height={pixels} fill="#fff" />
        <path d={d} fill="#000" />
      </svg>
      {caption && (
        <p
          className="max-w-[16rem] text-center text-base font-bold leading-tight text-ink"
          style={captionFontCss ? { fontFamily: captionFontCss } : undefined}
        >
          {caption}
        </p>
      )}
      {caption && showAddress && (
        <p dir="ltr" className="max-w-[16rem] break-all text-center font-mono text-xs leading-tight text-ink/75">
          {addressText ?? displayAddress(value)}
        </p>
      )}
      {downloadName && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={busy}
          className="text-xs text-primary hover:underline disabled:opacity-50"
        >
          {busy ? "جارٍ التجهيز…" : "تنزيل (PNG للطباعة)"}
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
