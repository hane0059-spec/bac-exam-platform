"use client";
// src/components/QrCode.tsx
// رمز QR مرسوم كـ SVG (بهامش/منطقة صامتة لقراءة موثوقة)، مع زرّ تنزيل
// اختياري يحوّله PNG — صيغة قابلة للطباعة ومشاركتها بين الهواتف.
import { useState } from "react";
import { qrPath } from "@/lib/qr";
import { downloadQrPng } from "@/lib/qrDownload";

export default function QrCode({
  value,
  size = 140,
  downloadName,
}: {
  value: string;
  size?: number;
  /** إن وُجد، يظهر زرّ «تنزيل» يحفظ الرمز بهذا الاسم كملف PNG. */
  downloadName?: string;
}) {
  const { pixels, d } = qrPath(value, size);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    if (!downloadName) return;
    setBusy(true);
    setError("");
    try {
      await downloadQrPng(value, downloadName);
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
