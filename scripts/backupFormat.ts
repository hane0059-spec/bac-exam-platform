// scripts/backupFormat.ts
// صيغة ملفّ النسخة الاحتياطية المشتركة بين db-backup وdb-restore (NDJSON مضغوط gzip):
//   سطر 1: {"format","createdAt"} · صفوف: {"m":"Model","d":{...}} · علاقات متعدّد-لمتعدّد: {"m2":"Model.field","a":id,"b":id}
//   آخر سطر: {"end":true,"counts":{...}} (أعداد كل جدول/علاقة للتحقّق من سلامة الملفّ).
import fs from "fs";
import zlib from "zlib";
import readline from "readline";

export const FORMAT = "bac-db-backup v1";
export const FILE_RE = /^bac-backup-\d{4}-\d{2}-\d{2}_\d{4}\.ndjson\.gz$/;

export function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** يقرأ .env (دون تجاوز متغيّرات البيئة الموجودة). */
export function loadEnv(): void {
  if (!fs.existsSync(".env")) return;
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
}

/** صفّ → JSON (تواريخ/بايتات/BigInt/Decimal بترميز `$d/$b/$n/$dec`). */
export function serializeRow(row: Record<string, unknown>): string {
  return JSON.stringify(row, function (this: Record<string, unknown>, k, v) {
    const raw = this[k];
    if (raw instanceof Date) return { $d: raw.toISOString() };
    if (Buffer.isBuffer(raw)) return { $b: raw.toString("base64") };
    if (typeof raw === "bigint") return { $n: raw.toString() };
    if (raw && typeof raw === "object" && (raw as { constructor?: { name?: string } }).constructor?.name === "Decimal")
      return { $dec: String(raw) };
    return v;
  });
}

/** عكس serializeRow على الحقول العليا للصفّ. */
export function decodeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const keys = Object.keys(v as object);
      if (keys.length === 1) {
        const tag = keys[0];
        const val = (v as Record<string, string>)[tag];
        if (tag === "$d") { out[k] = new Date(val); continue; }
        if (tag === "$b") { out[k] = Buffer.from(val, "base64"); continue; }
        if (tag === "$n") { out[k] = BigInt(val); continue; }
        if (tag === "$dec") { out[k] = val; continue; }
      }
    }
    out[k] = v;
  }
  return out;
}

export interface BackupData {
  createdAt: string;
  /** صفوف كل جدول (مفكوكة الترميز). */
  rows: Map<string, Record<string, unknown>[]>;
  /** علاقات متعدّد-لمتعدّد: "Model.field" ← أزواج (a = معرّف الطرف المالك، b = معرّف المرتبط). */
  m2m: Map<string, { a: string; b: string }[]>;
  counts: Record<string, number>;
}

/** يقرأ النسخة كاملةً ويتحقّق من الصيغة ومن تطابق الأعداد مع الذيل؛ يرمي خطأً إن كانت تالفة/ناقصة. */
export async function readBackup(file: string): Promise<BackupData> {
  const rl = readline.createInterface({
    input: fs.createReadStream(file).pipe(zlib.createGunzip()),
    crlfDelay: Infinity,
  });
  let header: { format?: string; createdAt?: string } | null = null;
  let footer: { counts: Record<string, number> } | null = null;
  const rows = new Map<string, Record<string, unknown>[]>();
  const m2m = new Map<string, { a: string; b: string }[]>();
  try {
    for await (const line of rl) {
      if (!line) continue;
      const o = JSON.parse(line);
      if (!header) {
        if (o.format !== FORMAT) throw new Error("ليست نسخة احتياطية بصيغة المنصّة");
        header = o;
      } else if (o.end) footer = o;
      else if (o.m2) {
        if (!m2m.has(o.m2)) m2m.set(o.m2, []);
        m2m.get(o.m2)!.push({ a: o.a, b: o.b });
      } else {
        if (!rows.has(o.m)) rows.set(o.m, []);
        rows.get(o.m)!.push(decodeRow(o.d));
      }
    }
  } catch (e) {
    throw new Error(`الملفّ تالف أو ناقص: ${e instanceof Error ? e.message : e}`);
  }
  if (!header || !footer) throw new Error("الملفّ ناقص (لا ذيل)");
  for (const [name, c] of Object.entries(footer.counts)) {
    const got = rows.get(name)?.length ?? m2m.get(name)?.length ?? 0;
    if (got !== c) throw new Error(`عدد «${name}» لا يطابق الذيل (${got} ≠ ${c}) — النسخة تالفة`);
  }
  return { createdAt: header.createdAt ?? "", rows, m2m, counts: footer.counts };
}
