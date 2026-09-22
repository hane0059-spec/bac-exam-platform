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

// منطقة صامتة (هامش أبيض) حول الرمز — ضرورية لقراءة موثوقة بالكاميرا
// بعد الطباعة أو التصوير، حسب توصية مواصفة QR (٤ وحدات على الأقلّ).
const QUIET_ZONE_MODULES = 4;

/** مسار SVG (d) للنقاط الداكنة فقط، مع حساب المنطقة الصامتة. */
export function qrPath(value: string, pixels = 200): { pixels: number; d: string } {
  const { size: n, cells } = qrMatrix(value);
  const totalModules = n + QUIET_ZONE_MODULES * 2;
  const cell = pixels / totalModules;
  const offset = QUIET_ZONE_MODULES * cell;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (cells[y][x]) {
        d += `M${offset + x * cell},${offset + y * cell}h${cell}v${cell}h${-cell}z`;
      }
    }
  }
  return { pixels, d };
}

/** سلسلة SVG كاملة قائمة بذاتها (تُستخدَم لتحويلها PNG عند التنزيل). */
export function qrSvgString(value: string, pixels = 1000): string {
  const { d } = qrPath(value, pixels);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" viewBox="0 0 ${pixels} ${pixels}">` +
    `<rect width="${pixels}" height="${pixels}" fill="#fff"/>` +
    `<path d="${d}" fill="#000"/>` +
    `</svg>`
  );
}
