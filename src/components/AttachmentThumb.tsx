// src/components/AttachmentThumb.tsx
// معاينة مرفق (صورة مصغّرة أو رابط PDF) تفتح الأصل في تبويب جديد.
export default function AttachmentThumb({
  id,
  mimeType,
}: {
  id: string;
  mimeType: string;
}) {
  const href = `/api/attachments/${id}`;
  if (mimeType === "application/pdf") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-24 w-24 items-center justify-center rounded-lg border border-line text-xs text-primary"
      >
        PDF ↗
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={href}
        alt="مرفق"
        className="h-24 w-24 rounded-lg border border-line object-cover"
      />
    </a>
  );
}
