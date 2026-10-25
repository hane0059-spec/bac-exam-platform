// scripts/db-backup.ts
// نسخة احتياطية كاملة من قاعدة البيانات (كل الجداول) إلى ملفّ NDJSON مضغوط، بلا pg_dump.
// قراءة فقط من القاعدة. الاستخدام:
//   npm run db:backup                 ← ينشئ نسخة جديدة ويحتفظ بآخر 8
//   npm run db:backup -- --verify ملف ← يتحقّق من سلامة ملفّ نسخة موجود
// متغيّرات اختيارية: BACKUP_DIR (الافتراضي ~/bac-backups)، BACKUP_KEEP (الافتراضي 8).
import fs from "fs";
import os from "os";
import path from "path";
import zlib from "zlib";
import readline from "readline";
import { once } from "events";
import { Prisma, PrismaClient } from "@prisma/client";

for (const line of fs.existsSync(".env") ? fs.readFileSync(".env", "utf8").split(/\r?\n/) : []) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
}

const FORMAT = "bac-db-backup v1";
const FILE_RE = /^bac-backup-\d{4}-\d{2}-\d{2}_\d{4}\.ndjson\.gz$/;
const outDir = process.env.BACKUP_DIR || path.join(os.homedir(), "bac-backups");
const keep = Math.max(2, Number(process.env.BACKUP_KEEP) || 8);

/** صفوف مؤقّتة لا تُنسَخ: أجزاء رفعٍ لم يكتمل. */
const skipRow = (model: string, row: Record<string, unknown>) =>
  model === "AppSetting" && String(row.key ?? "").startsWith("upload:");

function serialize(row: Record<string, unknown>): string {
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

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

async function backup() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL غير موجود في .env");
  fs.mkdirSync(outDir, { recursive: true });
  const prisma = new PrismaClient();
  const now = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  const name = `bac-backup-${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}_${p2(now.getHours())}${p2(now.getMinutes())}.ndjson.gz`;
  const tmp = path.join(outDir, name + ".part");
  const final = path.join(outDir, name);

  const gz = zlib.createGzip({ level: 6 });
  const ws = fs.createWriteStream(tmp);
  gz.pipe(ws);
  const write = async (s: string) => {
    if (!gz.write(s + "\n")) await once(gz, "drain");
  };

  const counts: Record<string, number> = {};
  try {
    await write(JSON.stringify({ format: FORMAT, createdAt: now.toISOString() }));
    for (const model of Prisma.dmmf.datamodel.models) {
      const delegate = (prisma as unknown as Record<string, any>)[lowerFirst(model.name)];
      const hasBytes = model.fields.some((f) => f.type === "Bytes");
      const hasId = model.fields.some((f) => f.name === "id" && f.isId);
      const take = hasBytes ? 10 : 500;
      let n = 0;
      const emit = async (rows: Record<string, unknown>[]) => {
        for (const row of rows) {
          if (skipRow(model.name, row)) continue;
          await write(`{"m":${JSON.stringify(model.name)},"d":${serialize(row)}}`);
          n++;
        }
      };
      if (hasId) {
        let cursor: string | undefined;
        for (;;) {
          const rows: Record<string, unknown>[] = await delegate.findMany({
            take,
            orderBy: { id: "asc" },
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          });
          if (rows.length === 0) break;
          await emit(rows);
          cursor = rows[rows.length - 1].id as string;
          if (rows.length < take) break;
        }
      } else {
        await emit(await delegate.findMany());
      }
      counts[model.name] = n;
    }
    await write(JSON.stringify({ end: true, counts }));
    gz.end();
    await once(ws, "finish");
  } catch (e) {
    gz.destroy();
    ws.destroy();
    fs.rmSync(tmp, { force: true });
    throw e;
  } finally {
    await prisma.$disconnect();
  }

  fs.renameSync(tmp, final);
  const verified = await verify(final);
  const mb = (fs.statSync(final).size / 1024 / 1024).toFixed(1);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`✔ نسخة جديدة: ${final} (${mb}MB، ${total} صفّاً، ${Object.keys(counts).length} جدولاً)`);
  if (!verified) {
    console.error("✘ فشل التحقّق من النسخة — لن تُحذف أي نسخة قديمة.");
    process.exitCode = 1;
    return;
  }
  console.log("✔ التحقّق نجح: الملفّ سليم وأعداد الصفوف مطابقة.");

  // الاحتفاظ بآخر N نسخ — الحذف لملفّات تطابق نمط الاسم الصارم فقط.
  const old = fs
    .readdirSync(outDir)
    .filter((f) => FILE_RE.test(f))
    .sort()
    .reverse()
    .slice(keep);
  for (const f of old) {
    fs.rmSync(path.join(outDir, f), { force: true });
    console.log(`   حُذفت نسخة قديمة: ${f}`);
  }
}

/** يقرأ الملفّ كاملاً: يتحقّق من التنسيق ومن أن أعداد الصفوف تطابق الذيل. */
async function verify(file: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: fs.createReadStream(file).pipe(zlib.createGunzip()),
    crlfDelay: Infinity,
  });
  let header = false;
  let footer: { counts: Record<string, number> } | null = null;
  const seen: Record<string, number> = {};
  try {
    for await (const line of rl) {
      if (!line) continue;
      const o = JSON.parse(line);
      if (!header) {
        if (o.format !== FORMAT) return false;
        header = true;
      } else if (o.end) footer = o;
      else seen[o.m] = (seen[o.m] ?? 0) + 1;
    }
  } catch {
    return false;
  }
  if (!header || !footer) return false;
  for (const [m, c] of Object.entries(footer.counts)) if ((seen[m] ?? 0) !== c) return false;
  return true;
}

async function main() {
  const i = process.argv.indexOf("--verify");
  if (i >= 0) {
    const f = process.argv[i + 1];
    if (!f || !fs.existsSync(f)) throw new Error("حدّد مسار ملفّ النسخة بعد --verify");
    const ok = await verify(f);
    console.log(ok ? "✔ النسخة سليمة" : "✘ النسخة تالفة أو ناقصة");
    process.exitCode = ok ? 0 : 1;
    return;
  }
  await backup();
}

main().catch((e) => {
  console.error("✘ فشل النسخ الاحتياطي:", e instanceof Error ? e.message : e);
  process.exit(1);
});
