// src/lib/certificateGeneral.ts
// «شهادة عامة» فارغة يعبّئها المستخدم: عنوان + اسم المُكرَّم + الجهة + السبب + شارة اختيارية + تاريخ + موقِّع.
// تستعمل الإطارات والشعارات نفسها (بما فيها الزخارف الإسلامية). للمتصفّح فقط عند الرسم.
import {
  CERT_H,
  CERT_W,
  brandBaseline,
  divider,
  goldGradient,
  paintBackdrop,
  paintLogo,
  starPath,
  text,
  themeFor,
  type CertFonts,
  type CertRenderOptions,
} from "@/lib/certificateArt";

export interface GeneralCertData {
  title: string;
  recipient: string;
  /** الجهة المانحة (مؤسّسة/مدرسة/منصّة…). */
  org: string;
  /** سبب المنح بنصّ حرّ (سطر أو أكثر). */
  reason: string;
  /** شارة اختيارية في شريط (مثل: المركز الأول). */
  badge?: string;
  dateStr: string;
  signerName: string;
  signerTitle: string;
}

/** عناوين مقترحة (تُكتَب حرّةً أيضاً). */
export const GENERAL_TITLES = [
  "شهادة تقدير",
  "شهادة شكر وتقدير",
  "شهادة تكريم",
  "شهادة إنجاز",
  "شهادة تفوّق",
  "شهادة مشاركة",
  "شهادة حضور",
  "شهادة إتمام دورة",
  "شهادة امتنان",
];

/** أسماء المُكرَّمين من نصّ بسطر لكل اسم (بلا فراغات زائدة ولا تكرار، حدّ أقصى). */
export function parseRecipients(raw: string, max = 200): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const name = line.replace(/\s+/g, " ").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
    if (out.length >= max) break;
  }
  return out;
}

type Ctx = CanvasRenderingContext2D;

/** يقسّم النصّ لأسطر بعرض أقصى، ويصغّر الخطّ حتى يتّسع في maxLines (وإلا يقتطع بـ …). */
function fitParagraph(
  ctx: Ctx,
  raw: string,
  family: string,
  maxW: number,
  maxLines: number,
  startSize: number,
  minSize: number
): { lines: string[]; size: number } {
  const words = raw.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  for (let size = startSize; size >= minSize; size -= 2) {
    ctx.font = `400 ${size}px ${family}`;
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width <= maxW || !cur) cur = next;
      else {
        lines.push(cur);
        cur = w;
      }
    }
    if (cur) lines.push(cur);
    if (lines.length <= maxLines) return { lines, size };
  }
  // لا يتّسع حتى بأصغر خطّ: اقتطع.
  ctx.font = `400 ${minSize}px ${family}`;
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width <= maxW || !cur) cur = next;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  const kept = lines.slice(0, maxLines);
  if (lines.length > maxLines) kept[maxLines - 1] = `${kept[maxLines - 1]} …`;
  return { lines: kept, size: minSize };
}

export function drawGeneralCertificate(
  ctx: Ctx,
  d: GeneralCertData,
  fonts: CertFonts,
  opts: CertRenderOptions = {}
): void {
  const t = themeFor(opts.themeId, opts.flagColors);
  const W = CERT_W;
  const cx = W / 2;

  paintBackdrop(ctx, t);
  const hasLogo = paintLogo(ctx, t, opts);

  const nameColor = t.nameColor ?? t.main;
  if (d.org.trim()) {
    text(ctx, d.org.trim(), cx, brandBaseline(t, hasLogo), 52, fonts.title, nameColor, { weight: 700, maxW: 1300 });
  }
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  text(ctx, d.title.trim() || "شهادة تقدير", cx, 395, 150, fonts.title, goldGradient(ctx, t, cx - 420, 270, cx + 420, 410), {
    weight: 700,
    maxW: 1250,
  });
  ctx.restore();
  divider(ctx, t, cx, 448, 330);

  text(ctx, "تُمنَح هذه الشهادة إلى", cx, 535, 46, fonts.body, t.ink, { maxW: 1500 });
  text(ctx, d.recipient.trim(), cx, 668, 120, fonts.body, nameColor, { weight: 700, maxW: 1500 });
  ctx.strokeStyle = goldGradient(ctx, t, cx - 520, 0, cx + 520, 0);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 520, 704);
  ctx.lineTo(cx + 520, 704);
  ctx.stroke();
  starPath(ctx, cx, 704, 14, 8, 0.5);
  ctx.fillStyle = t.gold;
  ctx.fill();

  // السبب: حتى 4 أسطر، يصغّر تلقائياً
  const reason = d.reason.trim();
  if (reason) {
    ctx.direction = "rtl";
    const { lines, size } = fitParagraph(ctx, reason, fonts.body, 1450, 4, 52, 34);
    const lh = Math.round(size * 1.45);
    const y0 = 790 + (lines.length < 3 ? 20 : 0);
    lines.forEach((ln, i) => text(ctx, ln, cx, y0 + i * lh, size, fonts.body, t.ink));
  }

  // شارة اختيارية (مثل: المركز الأول)
  const badge = d.badge?.trim();
  if (badge) {
    const bw = 760;
    const by = 1040;
    ctx.fillStyle = t.ribbonFill ?? t.main;
    ctx.beginPath();
    ctx.moveTo(cx - bw / 2 - 40, by);
    ctx.lineTo(cx - bw / 2, by - 4);
    ctx.lineTo(cx + bw / 2, by - 4);
    ctx.lineTo(cx + bw / 2 + 40, by);
    ctx.lineTo(cx + bw / 2, by + 66);
    ctx.lineTo(cx - bw / 2, by + 66);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = goldGradient(ctx, t, cx - bw / 2, 0, cx + bw / 2, 0);
    ctx.lineWidth = 4;
    ctx.stroke();
    text(ctx, badge, cx, by + 49, 48, fonts.title, t.ribbonText ?? t.goldLight, { weight: 700, maxW: bw - 80 });
  }

  // التوقيع والتاريخ
  const ly = 1205; // أعلى من الخطّ الداخلي لأعرض الأطر (غيّوشي)
  for (const [x0, x1] of [
    [250, 700],
    [W - 700, W - 250],
  ]) {
    ctx.strokeStyle = t.main;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, ly);
    ctx.lineTo(x1, ly);
    ctx.stroke();
  }
  text(ctx, d.signerName.trim(), 475, ly + 40, 38, fonts.body, t.mainDark, { weight: 700, maxW: 430 });
  if (d.signerTitle.trim()) text(ctx, d.signerTitle.trim(), 475, ly + 80, 32, fonts.body, t.ink, { maxW: 430 });
  text(ctx, d.dateStr.trim(), W - 475, ly - 14, 40, fonts.body, t.mainDark, { weight: 700, maxW: 430 });
  text(ctx, "التاريخ", W - 475, ly + 40, 34, fonts.body, t.ink);
}

/** عيّنة للمعاينات المصغّرة لنماذج الإطار. */
export const SAMPLE_GENERAL: GeneralCertData = {
  title: "شهادة تقدير",
  recipient: "اسم المُكرَّم",
  org: "اسم المؤسّسة",
  reason: "تقديراً لجهوده المتميّزة وعطائه المخلص، متمنّين له دوام التوفيق والنجاح.",
  badge: "",
  dateStr: "25/10/2026",
  signerName: "اسم الموقِّع",
  signerTitle: "المدير",
};
