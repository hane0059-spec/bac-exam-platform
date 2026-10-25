// src/lib/pdfImage.ts
// ملفّ PDF من صفحة واحدة (A4 أفقي) تحوي صورة JPEG بملء الصفحة — بلا أي مكتبة خارجية.
// الشهادة تُرسَم على canvas ثم تُحفَظ JPEG ويُغلَّف هنا فيصير PDF حقيقياً قابلاً للطباعة.

export const A4_LANDSCAPE_PT = { w: 842, h: 595 };

const enc = new TextEncoder();

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** يبني PDF (A4 أفقي) من بايتات JPEG وأبعادها بالبكسل. */
export function jpegToPdf(jpeg: Uint8Array, widthPx: number, heightPx: number): Uint8Array {
  const { w, h } = A4_LANDSCAPE_PT;
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (b: Uint8Array) => {
    chunks.push(b);
    pos += b.length;
  };
  const text = (s: string) => push(enc.encode(s));

  push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // %PDF-1.4 + تعليق ثنائي
  const obj = (n: number, body: string) => {
    offsets[n] = pos;
    text(`${n} 0 obj\n${body}\nendobj\n`);
  };

  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  );
  // كائن الصورة (ببايتات خام)
  offsets[4] = pos;
  text(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
  );
  push(jpeg);
  text("\nendstream\nendobj\n");
  const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const xrefPos = pos;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let n = 1; n <= 5; n++) xref += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  text(xref);
  text(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);
  return concat(chunks);
}
