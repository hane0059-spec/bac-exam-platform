// src/lib/credentialCards.ts
// بطاقات دخول الطلاب القابلة للقصّ: 8 بطاقات في صفحة A4 (عمودان × 4 صفوف) بخطوط قصّ منقطة
// ورمز QR لصفحة الدخول. دالة نقيّة تُنتج مستنداً HTML كاملاً للطباعة (بلا اعتماد على prisma).
import { qrMatrix } from "@/lib/qr";

export const CARDS_PER_PAGE = 8;

export interface CredentialCard {
  name: string;
  studentCode: string;
  password: string;
  group?: string;
}

export interface CardsOptions {
  brandName: string;
  /** رابط صفحة الدخول (يُرمَّز في QR ويُعرَض نصّاً بدون البروتوكول). */
  loginUrl: string;
  /** سطر سياق أعلى كل صفحة (مثل: الصفّ العاشر — علم الأحياء). */
  contextLine?: string;
  teacherName?: string;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** ترتيب حسب المجموعة (الفارغة أخيراً) مع بقاء ترتيب الملف داخل المجموعة. */
export function sortByGroup(cards: CredentialCard[]): CredentialCard[] {
  return cards
    .map((c, i) => ({ c, i }))
    .sort((a, b) => {
      const ga = a.c.group ?? "";
      const gb = b.c.group ?? "";
      if (ga === gb) return a.i - b.i;
      if (!ga) return 1;
      if (!gb) return -1;
      return ga.localeCompare(gb, "ar");
    })
    .map((x) => x.c);
}

export function chunkCards<T>(items: T[], size = CARDS_PER_PAGE): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

function cardHtml(c: CredentialCard, qrSvg: string, o: CardsOptions, host: string): string {
  return `<div class="card">
<div class="top"><b>${escapeHtml(o.brandName)}</b><span>${c.group ? escapeHtml(c.group) : "بطاقة دخول طالب"}</span></div>
<div class="body">
<div class="info">
<div class="nm">${escapeHtml(c.name)}</div>
<div class="row"><span>رمز الطالب</span><bdi class="v">${escapeHtml(c.studentCode)}</bdi></div>
<div class="row"><span>كلمة السرّ</span><bdi class="v">${escapeHtml(c.password)}</bdi></div>
<div class="row"><span>الرابط</span><bdi class="u">${escapeHtml(host)}</bdi></div>
</div>
<div class="qr">${qrSvg}<small>امسح للدخول</small></div>
</div>
<div class="note">غيّر كلمة السرّ بعد أول دخول${o.teacherName ? ` — المدرّس: ${escapeHtml(o.teacherName)}` : ""}</div>
</div>`;
}

export function buildCredentialCardsHtml(cards: CredentialCard[], o: CardsOptions): string {
  // QR واحد يُعرَّف مرّة ويُستعمَل لكل البطاقات (<use>)؛ خلايا بوحدة 1 مع دمج الأشواط الأفقية.
  const { size: n, cells } = qrMatrix(o.loginUrl);
  const Q = 4;
  let d = "";
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!cells[y][x]) {
        x++;
        continue;
      }
      let len = 0;
      while (x + len < n && cells[y][x + len]) len++;
      d += `M${x + Q} ${y + Q}h${len}v1h-${len}z`;
      x += len;
    }
  }
  const total = n + Q * 2;
  const qrDef = `<svg width="0" height="0" style="position:absolute"><symbol id="qr" viewBox="0 0 ${total} ${total}"><rect width="${total}" height="${total}" fill="#fff"/><path d="${d}" fill="#000"/></symbol></svg>`;
  const qrSvg = `<svg width="26mm" height="26mm" viewBox="0 0 ${total} ${total}"><use href="#qr"/></svg>`;
  const host = o.loginUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const pages = chunkCards(sortByGroup(cards));
  const pageCount = pages.length;
  const body = pages
    .map(
      (page, i) => `<section class="page">
<header><span>${o.contextLine ? escapeHtml(o.contextLine) : "بطاقات دخول الطلاب"}</span><span>صفحة ${i + 1} من ${pageCount}</span></header>
<div class="grid">${page.map((c) => cardHtml(c, qrSvg, o, host)).join("\n")}</div>
<footer>قصّ على الخطوط المنقطة وسلّم كل بطاقة لصاحبها</footer>
</section>`
    )
    .join("\n");
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>بطاقات دخول الطلاب</title>
<style>
@page{size:A4;margin:8mm}
*{box-sizing:border-box}
body{margin:0;font-family:Tahoma,Arial,sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{height:281mm;display:flex;flex-direction:column;page-break-after:always;break-after:page}
.page:last-child{page-break-after:auto;break-after:auto}
header,footer{display:flex;justify-content:space-between;font-size:11px;color:#555;height:6mm}
.grid{flex:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,1fr)}
.card{border:1px dashed #666;padding:4mm 5mm;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}
.top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ccc;padding-bottom:1.5mm;font-size:12px;color:#444}
.top b{font-size:15px;color:#111}
.body{display:flex;justify-content:space-between;align-items:center;gap:4mm;flex:1}
.info{flex:1;min-width:0}
.nm{font-size:16px;font-weight:bold;margin:1mm 0 2mm}
.row{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#444;margin:1mm 0}
.v{font-family:Consolas,"Courier New",monospace;font-size:16px;font-weight:bold;color:#000;letter-spacing:1px;direction:ltr}
.u{font-family:Consolas,"Courier New",monospace;font-size:11px;direction:ltr}
.qr{text-align:center;font-size:10px;color:#444;display:flex;flex-direction:column;align-items:center}
.note{font-size:11px;color:#8a4b00;border-top:1px solid #ccc;padding-top:1.5mm}
</style></head><body>${qrDef}${body}</body></html>`;
}
