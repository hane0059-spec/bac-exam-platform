"use client";
// src/components/ImageUploadField.tsx
// رفع بمعاينة: يضغط الصورة، يعرضها ليتحقّق الرافِع من وضوحها،
// ثم يؤكّد الرفع أو يحذفها ويختار غيرها.
import { useRef, useState } from "react";
import { prepareUpload, formatBytes, type PreparedFile } from "@/lib/imageCompress";

const MAX_BYTES = 3 * 1024 * 1024;

export default function ImageUploadField({
  onUpload,
  label = "أضف صورة",
  hint,
  maxDim,
  quality,
  capture,
  disabled,
}: {
  onUpload: (file: File) => Promise<void>;
  label?: string;
  hint?: string;
  maxDim?: number;
  quality?: number;
  capture?: boolean;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [prepared, setPrepared] = useState<PreparedFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPrepared(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function pick(file: File) {
    setError("");
    setBusy(true);
    const p = await prepareUpload(file, { maxDim, quality });
    setBusy(false);
    if (p.file.size > MAX_BYTES) {
      setError(
        `الحجم بعد الضغط ${formatBytes(p.file.size)} يتجاوز 3 م.ب — جرّب صورة أوضح بإضاءة أفضل أو PDF أصغر.`,
      );
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(p.file));
    setPrepared(p);
  }

  async function confirm() {
    if (!prepared) return;
    setBusy(true);
    setError("");
    try {
      await onUpload(prepared.file);
      reset(); // نجاح → عُد لاختيار صورة جديدة
    } catch (e) {
      setError(
        e instanceof Error && e.message ? e.message : "تعذّر الرفع، حاول مجدداً.",
      );
      setBusy(false);
    }
  }

  const isPdf = prepared?.file.type === "application/pdf";

  // وضع المعاينة قبل التأكيد.
  if (prepared && previewUrl) {
    return (
      <div className="space-y-3 rounded-xl border border-primary/40 bg-primary-light/30 p-3">
        {isPdf ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-primary hover:underline"
          >
            معاينة ملف PDF ↗
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="معاينة"
            className="max-h-72 w-auto rounded-lg border border-line"
          />
        )}

        <p className="text-xs text-ink/50">
          {prepared.width && prepared.height
            ? `الأبعاد ${prepared.width}×${prepared.height} • `
            : ""}
          الحجم {formatBytes(prepared.file.size)}
          {prepared.file.size < prepared.originalBytes &&
            ` (كان ${formatBytes(prepared.originalBytes)})`}
        </p>
        <p className="text-xs text-ink/50">
          تأكّد أن الصورة واضحة ومقروءة قبل الرفع.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={confirm}
            disabled={busy || disabled}
            className="btn-primary px-4 py-1.5 text-sm"
          >
            {busy ? "جارٍ الرفع…" : "رفع هذه الصورة"}
          </button>
          <button
            onClick={reset}
            disabled={busy}
            className="rounded-xl border border-line px-4 py-1.5 text-sm hover:bg-ink/5"
          >
            حذف واختيار غيرها
          </button>
        </div>
      </div>
    );
  }

  // وضع الاختيار.
  return (
    <div>
      <label className="mb-1 block text-sm text-ink/60">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        {...(capture ? { capture: "environment" as const } : {})}
        disabled={busy || disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pick(f);
        }}
        className="block text-sm"
      />
      {busy && <p className="mt-1 text-xs text-ink/40">جارٍ تجهيز الصورة…</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {hint && <p className="mt-1 text-xs text-ink/40">{hint}</p>}
    </div>
  );
}
