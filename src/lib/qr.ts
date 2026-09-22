// src/lib/qr.ts
// توليد مصفوفة QR نقيّة (بلا canvas) — تُستخدَم لرسم SVG يدوياً في المكوّن.
import QRCode from "qrcode";

export interface QrMatrix {
  size: number;
  cells: boolean[][];
}

export function qrMatrix(value: string): QrMatrix {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  const cells: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) row.push(!!data[y * size + x]);
    cells.push(row);
  }
  return { size, cells };
}

/** سلسلة SVG كاملة قائمة بذاتها (للتنزيل كملف) — بنفس منطق رسم QrCode.tsx. */
export function qrSvgString(value: string, pixels = 400): string {
  const { size: n, cells } = qrMatrix(value);
  const cell = pixels / n;
  let path = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (cells[y][x]) {
        path += `M${x * cell},${y * cell}h${cell}v${cell}h${-cell}z`;
      }
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" viewBox="0 0 ${pixels} ${pixels}">` +
    `<rect width="${pixels}" height="${pixels}" fill="#fff"/>` +
    `<path d="${path}" fill="#000"/>` +
    `</svg>`
  );
}
