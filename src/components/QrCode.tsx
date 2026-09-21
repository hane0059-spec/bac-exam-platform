// src/components/QrCode.tsx
// رمز QR مرسوم كـ SVG مباشرة (بلا canvas/صورة) — يعمل في خادم أو عميل.
import { qrMatrix } from "@/lib/qr";

export default function QrCode({
  value,
  size = 140,
}: {
  value: string;
  size?: number;
}) {
  const { size: n, cells } = qrMatrix(value);
  const cell = size / n;
  let path = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (cells[y][x]) {
        path += `M${x * cell},${y * cell}h${cell}v${cell}h${-cell}z`;
      }
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="رمز QR للانضمام السريع"
      className="rounded-lg border border-line bg-white p-1"
    >
      <path d={path} fill="#000" />
    </svg>
  );
}
