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

export interface PdfPage {
  jpeg: Uint8Array;
  widthPx: number;
  heightPx: number;
}

/** يبني PDF بصفحات A4 أفقية، في كلٍّ صورة JPEG بملء الصفحة. */
export function jpegsToPdf(pages: PdfPage[]): Uint8Array {
  const { w, h } = A4_LANDSCAPE_PT;
  const n = pages.length;
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (b: Uint8Array) => {
    chunks.push(b);
    pos += b.length;
  };
  const text = (s: string) => push(enc.encode(s));
  const obj = (num: number, body: string) => {
    offsets[num] = pos;
    text(`${num} 0 obj\n${body}\nendobj\n`);
  };

  push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // %PDF-1.4 + تعليق ثنائي
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] /Count ${n} >>`);
  pages.forEach((pg, i) => {
    const page = 3 + i * 3;
    const img = page + 1;
    const content = page + 2;
    obj(
      page,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${img} 0 R >> >> /Contents ${content} 0 R >>`
    );
    offsets[img] = pos;
    text(
      `${img} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pg.widthPx} /Height ${pg.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpeg.length} >>\nstream\n`
    );
    push(pg.jpeg);
    text("\nendstream\nendobj\n");
    const body = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    obj(content, `<< /Length ${body.length} >>\nstream\n${body}\nendstream`);
  });

  const count = 2 + n * 3;
  const xrefPos = pos;
  let xref = `xref\n0 ${count + 1}\n0000000000 65535 f \n`;
  for (let k = 1; k <= count; k++) xref += `${String(offsets[k]).padStart(10, "0")} 00000 n \n`;
  text(xref);
  text(`trailer\n<< /Size ${count + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);
  return concat(chunks);
}

/** يبني PDF (A4 أفقي) من صفحة واحدة: بايتات JPEG وأبعادها بالبكسل. */
export function jpegToPdf(jpeg: Uint8Array, widthPx: number, heightPx: number): Uint8Array {
  return jpegsToPdf([{ jpeg, widthPx, heightPx }]);
}
