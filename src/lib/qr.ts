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
