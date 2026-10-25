// src/lib/certificateArt.ts
// رسم شهادة التقدير الرسمية على canvas (A4 أفقي) بإطار قابل للاختيار من عدّة نماذج.
// بلا أيّ شعار أو ختم: إطار وزخرفة حدود فقط ثم النصّ وميدالية النسبة وشريط التقدير والتوقيع. للمتصفّح فقط.
import { certificateLines, gradeInfo, type CertificateData } from "@/lib/certificate";

export const CERT_W = 2000;
export const CERT_H = 1414;

export interface CertFonts {
  /** خطّ العناوين (Reem Kufi). */
  title: string;
  /** خطّ النصّ (Amiri). */
  body: string;
}

export type CertThemeId =
  | "emerald"
  | "navy"
  | "burgundy"
  | "classic"
  | "minimal"
  | "ruby"
  | "flag"
  | "geometric"
  | "mihrab"
  | "ottoman"
  | "royal"
  | "guilloche";
type FrameStyle =
  | "diamonds"
  | "stars"
  | "pearls"
  | "lines"
  | "modern"
  | "flag"
  | "khatim"
  | "mihrab"
  | "rosette"
  | "guilloche";

export interface CertTheme {
  id: CertThemeId;
  name: string;
  /** لونان لمعاينة الزرّ. */
  swatch: [string, string];
  main: string;
  mainDark: string;
  gold: string;
  goldLight: string;
  goldDark: string;
  bg1: string;
  bg2: string;
  ink: string;
  frame: FrameStyle;
  pattern: boolean;
  /** لون حبّات الشريط (pearls) إن اختلف عن goldLight. */
  pearl?: string;
  /** ألوان الأشرطة الثلاثة لنموذج «ألوان العلم». */
  stripes?: [string, string, string];
  /** لون شريط الإطار إن اختلف عن main (النماذج الداكنة). */
  band?: string;
  /** لون اسم المُكرَّم إن اختلف عن main. */
  nameColor?: string;
  /** شريط التقدير: لون التعبئة والنصّ إن اختلفا عن الافتراضي. */
  ribbonFill?: string;
  ribbonText?: string;
  /** ارتفاع مركز الشعار إن لزم تنحيته (المحراب). */
  logoY?: number;
}

/** ألوان افتراضية لنموذج العلم (يغيّرها المدرّس). */
export const DEFAULT_FLAG_COLORS: [string, string, string] = ["#b3122a", "#ffffff", "#1c1c1c"];

export const CERT_THEMES: CertTheme[] = [
  {
    id: "emerald",
    name: "الزمرّدي الذهبي",
    swatch: ["#0f5a4a", "#c9a227"],
    main: "#0f5a4a",
    mainDark: "#0a3d33",
    gold: "#c9a227",
    goldLight: "#f3dc84",
    goldDark: "#8d6a0e",
    bg1: "#fffaf0",
    bg2: "#f3e6c4",
    ink: "#3a3a3a",
    frame: "diamonds",
    pattern: true,
  },
  {
    id: "navy",
    name: "الأزرق الملكي",
    swatch: ["#13306b", "#c9a227"],
    main: "#13306b",
    mainDark: "#0a1c44",
    gold: "#c9a227",
    goldLight: "#f3dc84",
    goldDark: "#8d6a0e",
    bg1: "#fbfaf4",
    bg2: "#e9edf6",
    ink: "#2e3342",
    frame: "stars",
    pattern: true,
  },
  {
    id: "burgundy",
    name: "العنّابي الكلاسيكي",
    swatch: ["#7a1f2e", "#d4af37"],
    main: "#7a1f2e",
    mainDark: "#4d1119",
    gold: "#c9a227",
    goldLight: "#f3dc84",
    goldDark: "#8d6a0e",
    bg1: "#fffaf3",
    bg2: "#f6e6dc",
    ink: "#3b2e2e",
    frame: "pearls",
    pattern: true,
  },
  {
    id: "classic",
    name: "الذهبي الفاخر",
    swatch: ["#c9a227", "#fff3c4"],
    main: "#7a5a0a",
    mainDark: "#4d3806",
    gold: "#c9a227",
    goldLight: "#f7e59a",
    goldDark: "#7a5a0a",
    bg1: "#fffdf5",
    bg2: "#f7edcf",
    ink: "#40351c",
    frame: "lines",
    pattern: false,
  },
  {
    id: "minimal",
    name: "العصري البسيط",
    swatch: ["#1f7a8c", "#bfd7dc"],
    main: "#1f7a8c",
    mainDark: "#134b57",
    gold: "#2b9bb0",
    goldLight: "#9fd6e0",
    goldDark: "#1f7a8c",
    bg1: "#ffffff",
    bg2: "#eef6f8",
    ink: "#2d3b40",
    frame: "modern",
    pattern: false,
  },
  {
    id: "ruby",
    name: "الأحمر والأبيض",
    swatch: ["#b3122a", "#ffffff"],
    main: "#b3122a",
    mainDark: "#7d0b1c",
    gold: "#c0283c",
    goldLight: "#f4a3ad",
    goldDark: "#7d0b1c",
    bg1: "#ffffff",
    bg2: "#fbeaec",
    ink: "#3b2326",
    frame: "pearls",
    pattern: false,
    pearl: "#ffffff",
  },
  {
    id: "flag",
    name: "ألوان العلم",
    swatch: ["#b3122a", "#1c1c1c"],
    main: "#b3122a",
    mainDark: "#7d0b1c",
    gold: "#b3122a",
    goldLight: "#e57d8b",
    goldDark: "#7d0b1c",
    bg1: "#ffffff",
    bg2: "#f6f1ee",
    ink: "#2f2a2a",
    frame: "flag",
    pattern: false,
    stripes: DEFAULT_FLAG_COLORS,
  },
  {
    id: "geometric",
    name: "الهندسي الإسلامي",
    swatch: ["#0f5a4a", "#c9a227"],
    main: "#0f5a4a",
    mainDark: "#0a3d33",
    gold: "#c9a227",
    goldLight: "#f3dc84",
    goldDark: "#8d6a0e",
    bg1: "#fffaf0",
    bg2: "#f1e4c1",
    ink: "#34312a",
    frame: "khatim",
    pattern: true,
  },
  {
    id: "mihrab",
    name: "المحراب الأندلسي",
    swatch: ["#1d3b73", "#d4af37"],
    main: "#1d3b73",
    mainDark: "#11264d",
    gold: "#c9a227",
    goldLight: "#f3dc84",
    goldDark: "#8d6a0e",
    bg1: "#fdfaf1",
    bg2: "#e8edf6",
    ink: "#2c3447",
    frame: "mihrab",
    pattern: true,
    logoY: 172,
  },
  {
    id: "ottoman",
    name: "الوردة العثمانية",
    swatch: ["#0b6170", "#c9a227"],
    main: "#0b6170",
    mainDark: "#073f49",
    gold: "#c9a227",
    goldLight: "#f3dc84",
    goldDark: "#8d6a0e",
    bg1: "#fffbef",
    bg2: "#f4e9c9",
    ink: "#2e3a3c",
    frame: "rosette",
    pattern: true,
  },
  {
    id: "royal",
    name: "الملكي الداكن",
    swatch: ["#0c1530", "#d4af37"],
    main: "#f3dc84",
    mainDark: "#f3dc84",
    gold: "#d4af37",
    goldLight: "#f7e59a",
    goldDark: "#9a7b1c",
    bg1: "#1c2c52",
    bg2: "#0b1430",
    ink: "#ece6d2",
    frame: "khatim",
    pattern: true,
    band: "#0b1430",
    nameColor: "#f7e59a",
    ribbonFill: "#d4af37",
    ribbonText: "#0b1430",
  },
  {
    id: "guilloche",
    name: "الدولي الكلاسيكي",
    swatch: ["#6e4a1e", "#c9a227"],
    main: "#6e4a1e",
    mainDark: "#47300f",
    gold: "#c9a227",
    goldLight: "#f1dc8a",
    goldDark: "#7a5a0a",
    bg1: "#fffdf6",
    bg2: "#f5ebd0",
    ink: "#3d3220",
    frame: "guilloche",
    pattern: false,
  },
];

export function themeById(id: string | null | undefined): CertTheme {
  return CERT_THEMES.find((t) => t.id === id) ?? CERT_THEMES[0];
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
/** مزج لونين (t=0 الأوّل، t=1 الثاني). */
function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** النموذج الفعلي: «ألوان العلم» يُشتقّ من أشرطته الثلاثة التي اختارها المدرّس. */
export function themeFor(id: string | null | undefined, flagColors?: [string, string, string]): CertTheme {
  const t = themeById(id);
  if (t.id !== "flag") return t;
  const stripes = flagColors ?? DEFAULT_FLAG_COLORS;
  // اللون الغالب للنصوص: أغمق الأشرطة، والتمييز: أكثرها تشبّعاً (أو أوّلها).
  const sorted = [...stripes].sort((a, b) => luminance(a) - luminance(b));
  const dark = sorted[0];
  const sat = (h: string) => {
    const [r, g, b] = hexToRgb(h);
    return Math.max(r, g, b) - Math.min(r, g, b);
  };
  const accent = [...stripes].sort((a, b) => sat(b) - sat(a))[0];
  return {
    ...t,
    swatch: [stripes[0], stripes[2]],
    main: dark,
    mainDark: mix(dark, "#000000", 0.35),
    gold: accent,
    goldLight: mix(accent, "#ffffff", 0.5),
    goldDark: mix(accent, "#000000", 0.4),
    bg2: mix("#ffffff", accent, 0.08),
    stripes,
  };
}

// ───────── الشعارات الجاهزة ─────────
export type EmblemId = "rosette" | "star" | "book" | "cap" | "laurel";
export const EMBLEMS: { id: EmblemId; name: string }[] = [
  { id: "rosette", name: "وردة" },
  { id: "star", name: "نجمة" },
  { id: "book", name: "كتاب" },
  { id: "cap", name: "قبّعة تخرّج" },
  { id: "laurel", name: "إكليل غار" },
];

type Ctx = CanvasRenderingContext2D;

export function starPath(ctx: Ctx, cx: number, cy: number, r: number, points: number, inner = 0.45) {
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

export function goldGradient(ctx: Ctx, t: CertTheme, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, t.goldDark);
  g.addColorStop(0.25, t.goldLight);
  g.addColorStop(0.5, t.gold);
  g.addColorStop(0.75, t.goldLight);
  g.addColorStop(1, t.goldDark);
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
export function text(
  ctx: Ctx,
  s: string,
  x: number,
  y: number,
  size: number,
  family: string,
  fill: string | CanvasGradient,
  opts: { weight?: number; maxW?: number; dir?: "rtl" | "ltr" } = {}
) {
  const weight = opts.weight ?? 400;
  let px = size;
  ctx.direction = opts.dir ?? "rtl";
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

export function divider(ctx: Ctx, t: CertTheme, cx: number, y: number, half: number) {
  const g = goldGradient(ctx, t, cx - half, y, cx + half, y);
  ctx.strokeStyle = g;
  ctx.lineWidth = 3;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + dir * 26, y);
    ctx.lineTo(cx + dir * half, y);
    ctx.stroke();
    diamond(ctx, cx + dir * (half + 12), y, 7);
    ctx.fillStyle = t.gold;
    ctx.fill();
  }
  diamond(ctx, cx, y, 13);
  ctx.fillStyle = g;
  ctx.fill();
}

// ───────── نماذج الإطار ─────────

/** زوايا بأقواس متداخلة (مع وردة اختيارياً). */
function arcCorner(ctx: Ctx, t: CertTheme, x: number, y: number, sx: number, sy: number, rosette: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.strokeStyle = goldGradient(ctx, t, 0, 0, 160, 160);
  ctx.lineWidth = 5;
  for (const r of [150, 118, 86]) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI / 2);
    ctx.stroke();
  }
  if (rosette) {
    starPath(ctx, 0, 0, 70, 12, 0.55);
    ctx.fillStyle = goldGradient(ctx, t, -70, -70, 70, 70);
    ctx.fill();
    starPath(ctx, 0, 0, 44, 12, 0.55);
    ctx.fillStyle = t.main;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fillStyle = t.bg1;
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fillStyle = goldGradient(ctx, t, -36, -36, 36, 36);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fillStyle = t.main;
    ctx.fill();
  }
  ctx.restore();
}

function frameBand(ctx: Ctx, t: CertTheme, W: number, H: number, width: number) {
  ctx.lineJoin = "miter";
  ctx.strokeStyle = t.main;
  ctx.lineWidth = width;
  ctx.strokeRect(30, 30, W - 60, H - 60);
}

function innerGoldLines(ctx: Ctx, t: CertTheme, W: number, H: number) {
  ctx.strokeStyle = goldGradient(ctx, t, 0, 0, W, H);
  ctx.lineWidth = 7;
  ctx.strokeRect(58, 58, W - 116, H - 116);
  ctx.lineWidth = 2;
  ctx.strokeRect(74, 74, W - 148, H - 148);
}

function alongBand(ctx: Ctx, W: number, H: number, step: number, draw: (x: number, y: number) => void) {
  for (let x = 90; x < W - 60; x += step) {
    draw(x, 30);
    draw(x, H - 30);
  }
  for (let y = 90; y < H - 60; y += step) {
    draw(30, y);
    draw(W - 30, y);
  }
}

function drawEmblem(ctx: Ctx, t: CertTheme, id: EmblemId, cx: number, cy: number, R: number) {
  const s = R / 55;
  const g = goldGradient(ctx, t, cx - R, cy - R, cx + R, cy + R);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineJoin = "round";
  switch (id) {
    case "rosette": {
      ctx.beginPath();
      ctx.arc(0, 0, 54 * s, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 43 * s, 0, Math.PI * 2);
      ctx.fillStyle = t.main;
      ctx.fill();
      starPath(ctx, 0, 0, 37 * s, 16, 0.72);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 15 * s, 0, Math.PI * 2);
      ctx.fillStyle = t.mainDark;
      ctx.fill();
      starPath(ctx, 0, 0, 11 * s, 6, 0.5);
      ctx.fillStyle = t.goldLight;
      ctx.fill();
      break;
    }
    case "star": {
      ctx.beginPath();
      ctx.arc(0, 0, 54 * s, 0, Math.PI * 2);
      ctx.strokeStyle = g;
      ctx.lineWidth = 6 * s;
      ctx.stroke();
      starPath(ctx, 0, 0, 46 * s, 8, 0.5);
      ctx.fillStyle = t.main;
      ctx.fill();
      ctx.strokeStyle = g;
      ctx.lineWidth = 3 * s;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 13 * s, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      break;
    }
    case "book": {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, -16 * s);
        ctx.quadraticCurveTo(side * 26 * s, -34 * s, side * 52 * s, -26 * s);
        ctx.lineTo(side * 52 * s, 24 * s);
        ctx.quadraticCurveTo(side * 26 * s, 14 * s, 0, 32 * s);
        ctx.closePath();
        ctx.fillStyle = t.main;
        ctx.fill();
        ctx.strokeStyle = g;
        ctx.lineWidth = 4 * s;
        ctx.stroke();
        // سطور الصفحة
        ctx.strokeStyle = t.goldLight;
        ctx.lineWidth = 2 * s;
        for (const dy of [-8, 2, 12]) {
          ctx.beginPath();
          ctx.moveTo(side * 8 * s, dy * s + 2 * s);
          ctx.lineTo(side * 42 * s, dy * s - 6 * s);
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.moveTo(0, -16 * s);
      ctx.lineTo(0, 32 * s);
      ctx.strokeStyle = g;
      ctx.lineWidth = 4 * s;
      ctx.stroke();
      break;
    }
    case "cap": {
      // القاعدة
      ctx.beginPath();
      ctx.moveTo(-30 * s, 6 * s);
      ctx.lineTo(-30 * s, 28 * s);
      ctx.quadraticCurveTo(0, 46 * s, 30 * s, 28 * s);
      ctx.lineTo(30 * s, 6 * s);
      ctx.lineTo(0, 22 * s);
      ctx.closePath();
      ctx.fillStyle = t.mainDark;
      ctx.fill();
      // اللوح
      ctx.beginPath();
      ctx.moveTo(0, -36 * s);
      ctx.lineTo(58 * s, -8 * s);
      ctx.lineTo(0, 20 * s);
      ctx.lineTo(-58 * s, -8 * s);
      ctx.closePath();
      ctx.fillStyle = t.main;
      ctx.fill();
      ctx.strokeStyle = g;
      ctx.lineWidth = 4 * s;
      ctx.stroke();
      // الشرّابة
      ctx.beginPath();
      ctx.moveTo(46 * s, -3 * s);
      ctx.lineTo(46 * s, 26 * s);
      ctx.strokeStyle = g;
      ctx.lineWidth = 4 * s;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(46 * s, 30 * s, 6 * s, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
      break;
    }
    case "laurel": {
      for (const side of [-1, 1]) {
        for (let k = 0; k < 8; k++) {
          const th = Math.PI / 2 + side * (0.42 + k * 0.3);
          const x = Math.cos(th) * 46 * s;
          const y = Math.sin(th) * 46 * s;
          ctx.beginPath();
          ctx.ellipse(x, y, 6 * s, 14 * s, th + Math.PI / 2 + side * 0.25, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }
      }
      starPath(ctx, 0, -2 * s, 24 * s, 5, 0.45);
      ctx.fillStyle = t.main;
      ctx.fill();
      ctx.strokeStyle = g;
      ctx.lineWidth = 3 * s;
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

function drawFrame(ctx: Ctx, t: CertTheme, W: number, H: number) {
  const corners: [number, number, number, number][] = [
    [58, 58, 1, 1],
    [W - 58, 58, -1, 1],
    [58, H - 58, 1, -1],
    [W - 58, H - 58, -1, -1],
  ];
  const fillGold = goldGradient(ctx, t, 0, 0, W, H);

  switch (t.frame) {
    case "diamonds": {
      frameBand(ctx, t, W, H, 30);
      ctx.fillStyle = fillGold;
      alongBand(ctx, W, H, 70, (x, y) => {
        diamond(ctx, x, y, 7);
        ctx.fill();
      });
      innerGoldLines(ctx, t, W, H);
      corners.forEach(([x, y, sx, sy]) => arcCorner(ctx, t, x, y, sx, sy, true));
      break;
    }
    case "stars": {
      frameBand(ctx, t, W, H, 30);
      ctx.fillStyle = fillGold;
      alongBand(ctx, W, H, 90, (x, y) => {
        starPath(ctx, x, y, 11, 8, 0.45);
        ctx.fill();
      });
      innerGoldLines(ctx, t, W, H);
      corners.forEach(([x, y, sx, sy]) => arcCorner(ctx, t, x, y, sx, sy, false));
      break;
    }
    case "pearls": {
      frameBand(ctx, t, W, H, 34);
      ctx.fillStyle = t.pearl ?? t.goldLight;
      alongBand(ctx, W, H, 44, (x, y) => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      innerGoldLines(ctx, t, W, H);
      // زوايا مربّعة بمعيّن
      for (const [x, y] of corners) {
        ctx.fillStyle = goldGradient(ctx, t, x - 40, y - 40, x + 40, y + 40);
        ctx.fillRect(x - 40, y - 40, 80, 80);
        ctx.fillStyle = t.main;
        ctx.fillRect(x - 30, y - 30, 60, 60);
        diamond(ctx, x, y, 20);
        ctx.fillStyle = t.goldLight;
        ctx.fill();
      }
      break;
    }
    case "lines": {
      // ثلاثة خطوط ذهبية (غليظ/رفيع/غليظ) بلا شريط ملوّن
      const g = goldGradient(ctx, t, 0, 0, W, H);
      ctx.strokeStyle = g;
      ctx.lineWidth = 16;
      ctx.strokeRect(38, 38, W - 76, H - 76);
      ctx.lineWidth = 3;
      ctx.strokeRect(64, 64, W - 128, H - 128);
      ctx.lineWidth = 8;
      ctx.strokeRect(82, 82, W - 164, H - 164);
      for (const [x, y] of corners) {
        ctx.fillStyle = t.bg1;
        ctx.fillRect(x - 46, y - 46, 92, 92);
        ctx.strokeStyle = g;
        ctx.lineWidth = 6;
        ctx.strokeRect(x - 46, y - 46, 92, 92);
        diamond(ctx, x, y, 26);
        ctx.fillStyle = g;
        ctx.fill();
        diamond(ctx, x, y, 11);
        ctx.fillStyle = t.main;
        ctx.fill();
      }
      break;
    }
    case "flag": {
      const st = t.stripes ?? DEFAULT_FLAG_COLORS;
      const widths = 16;
      st.forEach((color, i) => {
        const inset = 36 + i * (widths + 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = widths;
        ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
        // خطّ رفيع يحدّد الشريط الفاتح حتى لا يذوب في الخلفية
        if (luminance(color) > 0.8) {
          ctx.strokeStyle = "#9a9a9a";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(inset - widths / 2, inset - widths / 2, W - (inset - widths / 2) * 2, H - (inset - widths / 2) * 2);
          ctx.strokeRect(inset + widths / 2, inset + widths / 2, W - (inset + widths / 2) * 2, H - (inset + widths / 2) * 2);
        }
      });
      for (const [x, y, sx, sy] of corners) {
        ctx.save();
        ctx.translate(x + sx * 38, y + sy * 38);
        ctx.scale(sx, sy);
        ctx.strokeStyle = st[0];
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 46, 0, Math.PI / 2);
        ctx.stroke();
        ctx.strokeStyle = st[2];
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 66, 0, Math.PI / 2);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case "khatim": {
      const band = t.band ?? t.main;
      ctx.strokeStyle = band;
      ctx.lineWidth = 46;
      ctx.strokeRect(38, 38, W - 76, H - 76);
      ctx.fillStyle = fillGold;
      for (let x = 112; x < W - 80; x += 66) {
        for (const y of [38, H - 38]) {
          starPath(ctx, x, y, 18, 8, 0.765);
          ctx.fill();
        }
      }
      for (let y = 112; y < H - 80; y += 66) {
        for (const x of [38, W - 38]) {
          starPath(ctx, x, y, 18, 8, 0.765);
          ctx.fill();
        }
      }
      ctx.fillStyle = t.goldLight;
      for (let x = 145; x < W - 80; x += 66) {
        for (const y of [38, H - 38]) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let y = 145; y < H - 80; y += 66) {
        for (const x of [38, W - 38]) {
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.strokeStyle = fillGold;
      ctx.lineWidth = 6;
      ctx.strokeRect(70, 70, W - 140, H - 140);
      ctx.lineWidth = 2;
      ctx.strokeRect(86, 86, W - 172, H - 172);
      for (const [x, y] of [
        [74, 74],
        [W - 74, 74],
        [74, H - 74],
        [W - 74, H - 74],
      ]) {
        starPath(ctx, x, y, 76, 8, 0.765);
        ctx.fillStyle = fillGold;
        ctx.fill();
        starPath(ctx, x, y, 60, 8, 0.765);
        ctx.fillStyle = band;
        ctx.fill();
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 8);
        starPath(ctx, 0, 0, 42, 8, 0.765);
        ctx.fillStyle = fillGold;
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fillStyle = t.bg1;
        ctx.fill();
      }
      break;
    }
    case "mihrab": {
      const band = t.band ?? t.main;
      ctx.strokeStyle = band;
      ctx.lineWidth = 24;
      ctx.strokeRect(40, 40, W - 80, H - 80);
      ctx.strokeStyle = fillGold;
      ctx.lineWidth = 5;
      ctx.strokeRect(64, 64, W - 128, H - 128);
      ctx.lineWidth = 2;
      ctx.strokeRect(78, 78, W - 156, H - 156);
      // صفّ المحاريب (أقواس مدبّبة) أعلى الشهادة
      const aw = 84;
      const n = Math.floor((W - 420) / aw);
      const x0 = W / 2 - ((n - 1) * aw) / 2;
      for (let k = 0; k < n; k++) {
        const x = x0 + k * aw;
        ctx.beginPath();
        ctx.moveTo(x - aw / 2 + 8, 124);
        ctx.bezierCurveTo(x - aw / 2 + 8, 100, x - 12, 98, x, 84);
        ctx.bezierCurveTo(x + 12, 98, x + aw / 2 - 8, 100, x + aw / 2 - 8, 124);
        ctx.closePath();
        ctx.fillStyle = band;
        ctx.fill();
        ctx.strokeStyle = fillGold;
        ctx.lineWidth = 3;
        ctx.stroke();
        diamond(ctx, x, 112, 5);
        ctx.fillStyle = t.goldLight;
        ctx.fill();
      }
      for (const [x, y] of [
        [78, 78],
        [W - 78, 78],
        [78, H - 78],
        [W - 78, H - 78],
      ]) {
        starPath(ctx, x, y, 44, 8, 0.765);
        ctx.fillStyle = fillGold;
        ctx.fill();
        starPath(ctx, x, y, 30, 8, 0.765);
        ctx.fillStyle = band;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fillStyle = t.goldLight;
        ctx.fill();
      }
      // معيّنات على الجانبين والأسفل
      ctx.fillStyle = fillGold;
      for (let y = 190; y < H - 150; y += 74) {
        diamond(ctx, 52, y, 6);
        ctx.fill();
        diamond(ctx, W - 52, y, 6);
        ctx.fill();
      }
      for (let x = 190; x < W - 150; x += 74) {
        diamond(ctx, x, H - 52, 6);
        ctx.fill();
      }
      break;
    }
    case "rosette": {
      const band = t.band ?? t.main;
      ctx.strokeStyle = band;
      ctx.lineWidth = 44;
      ctx.strokeRect(38, 38, W - 76, H - 76);
      const rosette = (x: number, y: number) => {
        starPath(ctx, x, y, 21, 12, 0.62);
        ctx.fillStyle = fillGold;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = band;
        ctx.fill();
      };
      for (let x = 118; x < W - 90; x += 80) {
        rosette(x, 38);
        rosette(x, H - 38);
      }
      for (let y = 118; y < H - 90; y += 80) {
        rosette(38, y);
        rosette(W - 38, y);
      }
      ctx.fillStyle = t.goldLight;
      for (let x = 158; x < W - 90; x += 80) {
        diamond(ctx, x, 38, 6);
        ctx.fill();
        diamond(ctx, x, H - 38, 6);
        ctx.fill();
      }
      for (let y = 158; y < H - 90; y += 80) {
        diamond(ctx, 38, y, 6);
        ctx.fill();
        diamond(ctx, W - 38, y, 6);
        ctx.fill();
      }
      ctx.strokeStyle = fillGold;
      ctx.lineWidth = 6;
      ctx.strokeRect(72, 72, W - 144, H - 144);
      ctx.lineWidth = 2;
      ctx.strokeRect(88, 88, W - 176, H - 176);
      for (const [x, y] of [
        [76, 76],
        [W - 76, 76],
        [76, H - 76],
        [W - 76, H - 76],
      ]) {
        starPath(ctx, x, y, 80, 16, 0.78);
        ctx.fillStyle = fillGold;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 56, 0, Math.PI * 2);
        ctx.fillStyle = band;
        ctx.fill();
        starPath(ctx, x, y, 46, 12, 0.6);
        ctx.fillStyle = fillGold;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = t.bg1;
        ctx.fill();
      }
      break;
    }
    case "guilloche": {
      ctx.strokeStyle = fillGold;
      ctx.lineWidth = 5;
      ctx.strokeRect(36, 36, W - 72, H - 72);
      ctx.strokeRect(112, 112, W - 224, H - 224);
      ctx.lineWidth = 2;
      ctx.strokeRect(46, 46, W - 92, H - 92);
      ctx.strokeRect(102, 102, W - 204, H - 204);
      // موجتان متقاطعتان (غيّوشي) على كل ضلع
      const wave = (horizontal: boolean, fixed: number, phase: number, color: string | CanvasGradient, w: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        const len = horizontal ? W : H;
        for (let a = 118; a <= len - 118; a += 4) {
          const off = 22 * Math.sin((a / 62) * Math.PI * 2 + phase);
          const x = horizontal ? a : fixed + off;
          const y = horizontal ? fixed + off : a;
          if (a === 118) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };
      for (const fixed of [74, H - 74]) {
        wave(true, fixed, 0, t.main, 5);
        wave(true, fixed, Math.PI, fillGold, 4);
      }
      for (const fixed of [74, W - 74]) {
        wave(false, fixed, 0, t.main, 5);
        wave(false, fixed, Math.PI, fillGold, 4);
      }
      for (const [x, y] of [
        [74, 74],
        [W - 74, 74],
        [74, H - 74],
        [W - 74, H - 74],
      ]) {
        ctx.fillStyle = t.bg1;
        ctx.fillRect(x - 40, y - 40, 80, 80);
        ctx.strokeStyle = fillGold;
        ctx.lineWidth = 5;
        ctx.strokeRect(x - 40, y - 40, 80, 80);
        starPath(ctx, x, y, 32, 12, 0.6);
        ctx.fillStyle = fillGold;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.fillStyle = t.main;
        ctx.fill();
      }
      break;
    }
    case "modern": {
      frameBand(ctx, t, W, H, 14);
      ctx.strokeStyle = t.gold;
      ctx.lineWidth = 3;
      ctx.strokeRect(66, 66, W - 132, H - 132);
      for (const [x, y, sx, sy] of corners) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(sx, sy);
        ctx.strokeStyle = t.main;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 58, 0, Math.PI / 2);
        ctx.stroke();
        ctx.strokeStyle = t.gold;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 80, 0, Math.PI / 2);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
  }
}

/** الخلفية + النقش + الإطار (مشتركة بين شهادة الإنجاز والشهادة العامّة). */
export function paintBackdrop(ctx: Ctx, t: CertTheme): void {
  const W = CERT_W;
  const H = CERT_H;
  const cx = W / 2;
  const bg = ctx.createRadialGradient(cx, H / 2, 100, cx, H / 2, W * 0.7);
  bg.addColorStop(0, t.bg1);
  bg.addColorStop(1, t.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  if (t.pattern) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(96, 96, W - 192, H - 192);
    ctx.clip();
    const step = 96;
    for (let row = 0, y = 96; y < H; row++, y += step / 2) {
      for (let x = 96 + (row % 2 ? step / 2 : 0); x < W; x += step) {
        starPath(ctx, x, y, 20, 8, 0.5);
        ctx.fillStyle = "rgba(160,130,40,0.07)";
        ctx.fill();
      }
    }
    ctx.restore();
  }
  drawFrame(ctx, t, W, H);
}

/** يرسم الشعار (صورة مرفوعة أو جاهز) أعلى الشهادة ويُعيد هل رُسم شيء. */
export function paintLogo(
  ctx: Ctx,
  t: CertTheme,
  opts: { emblem?: EmblemId | null; logoImage?: CanvasImageSource | null }
): boolean {
  const cx = CERT_W / 2;
  const y = t.logoY ?? 140;
  const radius = t.logoY ? 46 : 54;
  if (opts.logoImage) {
    const img = opts.logoImage as CanvasImageSource & { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number };
    const iw = img.naturalWidth ?? img.width ?? 1;
    const ih = img.naturalHeight ?? img.height ?? 1;
    const box = { w: 260, h: radius * 2 + 4 };
    const k = Math.min(box.w / iw, box.h / ih);
    ctx.drawImage(img, cx - (iw * k) / 2, y - (ih * k) / 2, iw * k, ih * k);
    return true;
  }
  if (opts.emblem) {
    drawEmblem(ctx, t, opts.emblem, cx, y, radius);
    return true;
  }
  return false;
}

/** ارتفاع سطر اسم الجهة/المنصّة تحت الشعار. */
export function brandBaseline(t: CertTheme, hasLogo: boolean): number {
  if (!hasLogo) return 232;
  return t.logoY ? t.logoY + 90 : 252;
}

export interface CertRenderOptions {
  themeId?: CertThemeId;
  /** ألوان نموذج «ألوان العلم». */
  flagColors?: [string, string, string];
  /** شعار جاهز يُرسَم أعلى الشهادة. */
  emblem?: EmblemId | null;
  /** صورة شعار يرفعها المدرّس (لها الأولوية على الجاهز). */
  logoImage?: CanvasImageSource | null;
}

export function drawCertificate(
  ctx: Ctx,
  d: CertificateData,
  fonts: CertFonts,
  opts: CertRenderOptions = {}
): void {
  const t = themeFor(opts.themeId, opts.flagColors);
  const W = CERT_W;
  const H = CERT_H;
  const L = certificateLines(d);
  const cx = W / 2;

  paintBackdrop(ctx, t);
  const hasLogo = paintLogo(ctx, t, opts);

  // ── المنصّة والعنوان ──
  text(ctx, d.brandName, cx, brandBaseline(t, hasLogo), 46, fonts.title, t.nameColor ?? t.main, { weight: 700, maxW: 900 });
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  text(ctx, L.title, cx, 395, 154, fonts.title, goldGradient(ctx, t, cx - 420, 270, cx + 420, 410), {
    weight: 700,
  });
  ctx.restore();
  divider(ctx, t, cx, 448, 330);

  // ── نصّ المنح ──
  text(ctx, L.intro, cx, 535, 48, fonts.body, t.ink, { maxW: 1500 });
  text(ctx, d.studentName, cx, 665, 124, fonts.body, t.nameColor ?? t.main, { weight: 700, maxW: 1500 });
  ctx.strokeStyle = goldGradient(ctx, t, cx - 520, 0, cx + 520, 0);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 520, 702);
  ctx.lineTo(cx + 520, 702);
  ctx.stroke();
  starPath(ctx, cx, 702, 14, 8, 0.5);
  ctx.fillStyle = t.gold;
  ctx.fill();

  text(ctx, L.body1, cx, 785, 48, fonts.body, t.ink, { maxW: 1500 });
  text(ctx, L.body2, cx, 847, 48, fonts.body, t.ink, { maxW: 1500 });

  // ── ميدالية النسبة ──
  const my = 972;
  ctx.beginPath();
  ctx.arc(cx, my, 100, 0, Math.PI * 2);
  ctx.fillStyle = goldGradient(ctx, t, cx - 100, my - 100, cx + 100, my + 100);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, my, 84, 0, Math.PI * 2);
  ctx.fillStyle = t.bg1;
  ctx.fill();
  ctx.strokeStyle = t.goldDark;
  ctx.lineWidth = 3;
  ctx.stroke();
  const pctStr = `${Math.round(d.percentage * 10) / 10}%`;
  const info = gradeInfo(d.percentage);
  text(ctx, pctStr, cx, my + (info ? 10 : 24), info ? 60 : 74, fonts.title, t.mainDark, { weight: 700, maxW: 140 });
  if (info) {
    // حرف التقدير الدولي (A+ … D) تحت النسبة
    text(ctx, info.letter, cx, my + 54, 34, fonts.title, t.main, { weight: 700, dir: "ltr" });
  }

  // شريط التقدير
  const bw = 820;
  const by = 1096;
  ctx.fillStyle = t.ribbonFill ?? t.main;
  ctx.beginPath();
  ctx.moveTo(cx - bw / 2 - 40, by);
  ctx.lineTo(cx - bw / 2, by - 4);
  ctx.lineTo(cx + bw / 2, by - 4);
  ctx.lineTo(cx + bw / 2 + 40, by);
  ctx.lineTo(cx + bw / 2, by + 62);
  ctx.lineTo(cx - bw / 2, by + 62);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = goldGradient(ctx, t, cx - bw / 2, 0, cx + bw / 2, 0);
  ctx.lineWidth = 4;
  ctx.stroke();
  text(ctx, `بتقدير: ${d.honor}`, cx, by + 46, 46, fonts.title, t.ribbonText ?? t.goldLight, { weight: 700, maxW: bw - 80 });

  // الإطار «غيّوشي» أعرض فيُرفَع الختام والتوقيع قليلاً ليبقيا داخل المساحة الحرّة.
  const tight = t.frame === "guilloche";
  text(ctx, L.closing, cx, tight ? 1198 : 1222, 42, fonts.body, t.ink, { maxW: 1400 });

  // ── التوقيع والتاريخ ──
  const ly = tight ? 1245 : 1290;
  for (const [x0, x1] of [
    [250, 650],
    [W - 650, W - 250],
  ]) {
    ctx.strokeStyle = t.main;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, ly);
    ctx.lineTo(x1, ly);
    ctx.stroke();
  }
  text(ctx, L.signLabel, 450, ly + 42, 36, fonts.body, t.ink, { maxW: 380 });
  text(ctx, d.dateStr, W - 450, ly - 14, 40, fonts.body, t.mainDark, { weight: 700, maxW: 380 });
  text(ctx, L.dateLabel, W - 450, ly + 42, 36, fonts.body, t.ink);
}
