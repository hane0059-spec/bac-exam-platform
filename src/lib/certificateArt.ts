// src/lib/certificateArt.ts
// رسم شهادة التقدير الرسمية على canvas (A4 أفقي): إطار أخضر وذهبي بزوايا مزخرفة، خلفية بنقش نجمي،
// شعار وردة، عنوان ذهبي، ميدالية النسبة وشريط التقدير، توقيع وتاريخ وختم. للمتصفّح فقط.
import { certificateLines, type CertificateData } from "@/lib/certificate";

export const CERT_W = 2000;
export const CERT_H = 1414;

export interface CertFonts {
  /** خطّ العناوين (Reem Kufi). */
  title: string;
  /** خطّ النصّ (Amiri). */
  body: string;
}

const GREEN = "#0f5a4a";
const GREEN_D = "#0a3d33";
const GOLD = "#c9a227";
const GOLD_L = "#f3dc84";
const GOLD_D = "#8d6a0e";
const IVORY = "#fffaf0";
const IVORY2 = "#f3e6c4";
const INK = "#3a3a3a";

type Ctx = CanvasRenderingContext2D;

function starPath(ctx: Ctx, cx: number, cy: number, r: number, points: number, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / points;
    const rad = i % 2 === 0 ? r : r * inner;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function goldGradient(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, GOLD_D);
  g.addColorStop(0.25, GOLD_L);
  g.addColorStop(0.5, GOLD);
  g.addColorStop(0.75, GOLD_L);
  g.addColorStop(1, GOLD_D);
  return g;
}

function diamond(ctx: Ctx, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
}

/** نصّ مركَّز بعرض أقصى (يصغّر الخطّ تلقائياً حتى يتّسع). */
function text(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  size: number,
  family: string,
  fill: string | CanvasGradient,
  opts: { weight?: number; maxW?: number } = {}
) {
  const weight = opts.weight ?? 400;
  let px = size;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${weight} ${px}px ${family}`;
  if (opts.maxW) {
    while (ctx.measureText(s).width > opts.maxW && px > 18) {
      px -= 2;
      ctx.font = `${weight} ${px}px ${family}`;
    }
  }
  ctx.fillStyle = fill;
  ctx.fillText(s, x, y);
}

function divider(ctx: Ctx, cx: number, y: number, half: number) {
  const g = goldGradient(ctx, cx - half, y, cx + half, y);
  ctx.strokeStyle = g;
  ctx.lineWidth = 3;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * 26, y);
    ctx.lineTo(cx + dir * half, y);
    ctx.stroke();
    diamond(ctx, cx + dir * (half + 12), y, 7);
    ctx.fillStyle = GOLD;
    ctx.fill();
  }
  diamond(ctx, cx, y, 13);
  ctx.fillStyle = g;
  ctx.fill();
}

function cornerOrnament(ctx: Ctx, x: number, y: number, sx: number, sy: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  // أقواس متداخلة
  ctx.strokeStyle = goldGradient(ctx, 0, 0, 160, 160);
  ctx.lineWidth = 5;
  for (const r of [150, 118, 86]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI / 2);
    ctx.stroke();
  }
  // وردة الزاوية
  starPath(ctx, 0, 0, 70, 12, 0.55);
  ctx.fillStyle = goldGradient(ctx, -70, -70, 70, 70);
  ctx.fill();
  starPath(ctx, 0, 0, 44, 12, 0.55);
  ctx.fillStyle = GREEN;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fillStyle = IVORY;
  ctx.fill();
  ctx.restore();
}

function seal(ctx: Ctx, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = goldGradient(ctx, cx - r, cy - r, cx + r, cy + r);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 7, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD_D;
  ctx.lineWidth = 2;
  ctx.stroke();
  starPath(ctx, cx, cy, r - 14, 16, 0.78);
  ctx.fillStyle = GREEN;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.36, 0, Math.PI * 2);
  ctx.fillStyle = GOLD_L;
  ctx.fill();
  starPath(ctx, cx, cy, r * 0.28, 5, 0.45);
  ctx.fillStyle = GREEN_D;
  ctx.fill();
}

export function drawCertificate(ctx: Ctx, d: CertificateData, fonts: CertFonts): void {
  const W = CERT_W;
  const H = CERT_H;
  const L = certificateLines(d);
  const cx = W / 2;

  // ── الخلفية ──
  const bg = ctx.createRadialGradient(cx, H / 2, 100, cx, H / 2, W * 0.7);
  bg.addColorStop(0, IVORY);
  bg.addColorStop(1, IVORY2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // نقش نجمي خافت داخل الإطار
  ctx.save();
  ctx.beginPath();
  ctx.rect(88, 88, W - 176, H - 176);
  ctx.clip();
  const step = 96;
  for (let row = 0, y = 88; y < H; row++, y += step / 2) {
    for (let x = 88 + (row % 2 ? step / 2 : 0); x < W; x += step) {
      starPath(ctx, x, y, 20, 8, 0.5);
      ctx.fillStyle = "rgba(201,162,39,0.075)";
      ctx.fill();
    }
  }
  ctx.restore();

  // ── الإطار ──
  ctx.lineJoin = "miter";
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 30;
  ctx.strokeRect(30, 30, W - 60, H - 60);
  // معينات ذهبية على الشريط الأخضر
  ctx.fillStyle = goldGradient(ctx, 0, 0, W, H);
  for (let x = 90; x < W - 60; x += 70) {
    diamond(ctx, x, 30, 7);
    ctx.fill();
    diamond(ctx, x, H - 30, 7);
    ctx.fill();
  }
  for (let y = 90; y < H - 60; y += 70) {
    diamond(ctx, 30, y, 7);
    ctx.fill();
    diamond(ctx, W - 30, y, 7);
    ctx.fill();
  }
  ctx.strokeStyle = goldGradient(ctx, 0, 0, W, H);
  ctx.lineWidth = 7;
  ctx.strokeRect(58, 58, W - 116, H - 116);
  ctx.lineWidth = 2;
  ctx.strokeRect(74, 74, W - 148, H - 148);
  cornerOrnament(ctx, 58, 58, 1, 1);
  cornerOrnament(ctx, W - 58, 58, -1, 1);
  cornerOrnament(ctx, 58, H - 58, 1, -1);
  cornerOrnament(ctx, W - 58, H - 58, -1, -1);

  // ── الشعار (وردة) ──
  const ey = 180;
  ctx.beginPath();
  ctx.arc(cx, ey, 84, 0, Math.PI * 2);
  ctx.fillStyle = goldGradient(ctx, cx - 84, ey - 84, cx + 84, ey + 84);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, ey, 68, 0, Math.PI * 2);
  ctx.fillStyle = GREEN;
  ctx.fill();
  starPath(ctx, cx, ey, 58, 16, 0.72);
  ctx.fillStyle = goldGradient(ctx, cx - 58, ey - 58, cx + 58, ey + 58);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, ey, 24, 0, Math.PI * 2);
  ctx.fillStyle = GREEN_D;
  ctx.fill();
  starPath(ctx, cx, ey, 17, 6, 0.5);
  ctx.fillStyle = GOLD_L;
  ctx.fill();

  text(ctx, d.brandName, cx, 290, 44, fonts.title, GREEN, { weight: 700, maxW: 900 });

  // ── العنوان ──
  ctx.save();
  ctx.shadowColor = "rgba(141,106,14,0.35)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  text(ctx, L.title, cx, 452, 150, fonts.title, goldGradient(ctx, cx - 420, 300, cx + 420, 460), {
    weight: 700,
  });
  ctx.restore();
  divider(ctx, cx, 498, 330);

  // ── نصّ المنح ──
  text(ctx, L.intro, cx, 572, 48, fonts.body, INK, { maxW: 1500 });
  text(ctx, d.studentName, cx, 698, 124, fonts.body, GREEN, { weight: 700, maxW: 1500 });
  // خطّ زخرفي تحت الاسم
  ctx.strokeStyle = goldGradient(ctx, cx - 520, 0, cx + 520, 0);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 520, 733);
  ctx.lineTo(cx + 520, 733);
  ctx.stroke();
  starPath(ctx, cx, 733, 14, 8, 0.5);
  ctx.fillStyle = GOLD;
  ctx.fill();

  text(ctx, L.body1, cx, 812, 48, fonts.body, INK, { maxW: 1500 });
  text(ctx, L.body2, cx, 872, 48, fonts.body, INK, { maxW: 1500 });

  // ── ميدالية النسبة ──
  const my = 985;
  ctx.beginPath();
  ctx.arc(cx, my, 100, 0, Math.PI * 2);
  ctx.fillStyle = goldGradient(ctx, cx - 100, my - 100, cx + 100, my + 100);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, my, 84, 0, Math.PI * 2);
  ctx.fillStyle = IVORY;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, my, 84, 0, Math.PI * 2);
  ctx.strokeStyle = GOLD_D;
  ctx.lineWidth = 3;
  ctx.stroke();
  const pctStr = `${Math.round(d.percentage * 10) / 10}%`;
  text(ctx, pctStr, cx, my + 24, 74, fonts.title, GREEN_D, { weight: 700, maxW: 150 });

  // شريط التقدير
  const bw = 820;
  const by = 1105;
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.moveTo(cx - bw / 2 - 40, by);
  ctx.lineTo(cx - bw / 2, by - 4);
  ctx.lineTo(cx + bw / 2, by - 4);
  ctx.lineTo(cx + bw / 2 + 40, by);
  ctx.lineTo(cx + bw / 2, by + 62);
  ctx.lineTo(cx - bw / 2, by + 62);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = goldGradient(ctx, cx - bw / 2, 0, cx + bw / 2, 0);
  ctx.lineWidth = 4;
  ctx.stroke();
  text(ctx, `بتقدير: ${d.honor}`, cx, by + 46, 46, fonts.title, GOLD_L, { weight: 700, maxW: bw - 80 });

  text(ctx, L.closing, cx, 1225, 40, fonts.body, INK, { maxW: 1400 });

  // ── التوقيع والتاريخ والختم ──
  const ly = 1285;
  for (const [x0, x1] of [
    [250, 650],
    [W - 650, W - 250],
  ]) {
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, ly);
    ctx.lineTo(x1, ly);
    ctx.stroke();
  }
  text(ctx, L.signLabel, 450, ly + 40, 34, fonts.body, INK, { maxW: 380 });
  text(ctx, d.dateStr, W - 450, ly - 14, 38, fonts.body, GREEN_D, { weight: 700, maxW: 380 });
  text(ctx, L.dateLabel, W - 450, ly + 40, 34, fonts.body, INK);
  seal(ctx, cx, 1280, 62);
}
