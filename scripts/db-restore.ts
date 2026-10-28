// scripts/db-restore.ts
// استرجاع من نسخة db:backup. افتراضياً «تجربة جافة» لا تكتب شيئاً.
//   npm run db:restore                                  ← تجربة جافة من أحدث نسخة: ماذا سيُعاد؟
//   npm run db:restore -- --file=مسار.ndjson.gz         ← من نسخة محدّدة
//   npm run db:restore -- --tables=EnrichmentFile,Notification   ← جداول محدّدة فقط
//   npm run db:restore -- --apply --confirm=<معرّف الخادم>      ← تنفيذ فعلي (المعرّف يُطبع في التجربة الجافة)
// خيارات:
//   --mode=missing (الافتراضي)  يعيد الصفوف الغائبة فقط ولا يلمس ما هو موجود (آمن على القاعدة الحيّة)
//   --mode=full                 لقاعدة فارغة تماماً فقط (مثل فرع Neon جديد بعد db:push)؛ يرفض غير الفارغة
//   --target=اسم_متغير_بيئة      قاعدة هدف غير DATABASE_URL (مثل فرع استرجاع) — يُنصح بتجربتها قبل الحيّة
//   --skip-pre-backup           لا تأخذ نسخة أمان قبل التنفيذ (غير مستحسن)
// كل الكتابة في معاملة واحدة: إمّا ينجح الكلّ أو لا يتغيّر شيء. لا حذف ولا تعديل لصفوف موجودة أبداً.
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { Prisma, PrismaClient } from "@prisma/client";
import { FILE_RE, loadEnv, lowerFirst, readBackup } from "./backupFormat";

loadEnv();

type Row = Record<string, unknown>;
type DModel = (typeof Prisma.dmmf.datamodel.models)[number];

const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const opt = (n: string) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const positional = argv.find((a) => !a.startsWith("--"));

const models = Prisma.dmmf.datamodel.models;
const byName = new Map(models.map((m) => [m.name, m]));
const pkOf = (m: DModel) => m.fields.find((f) => f.isId)!.name;

/** مفاتيح أجنبية: حقل عددي ← نموذج الهدف، وهل هو إلزامي. */
function fksOf(m: DModel) {
  const out: { field: string; target: string; required: boolean }[] = [];
  for (const f of m.fields) {
    if (f.kind !== "object" || !f.relationFromFields?.length) continue;
    f.relationFromFields.forEach((sf) => {
      const sc = m.fields.find((x) => x.name === sf)!;
      out.push({ field: sf, target: f.type, required: sc.isRequired });
    });
  }
  return out;
}

/** ترتيب الإدراج: الآباء قبل الأبناء (يتجاهل المرجع الذاتي). */
function insertOrder(): string[] {
  const deps = new Map(models.map((m) => [m.name, new Set(fksOf(m).map((f) => f.target).filter((t) => t !== m.name))]));
  const done: string[] = [];
  const left = new Set(models.map((m) => m.name));
  while (left.size) {
    const ready = [...left].filter((n) => [...deps.get(n)!].every((d) => !left.has(d)));
    if (!ready.length) throw new Error(`دورة تبعيّة بين الجداول: ${[...left].join(", ")}`);
    for (const n of ready.sort()) {
      done.push(n);
      left.delete(n);
    }
  }
  return done;
}

/** يرتّب صفوف الجدول بحيث يسبق الأبُ ابنه (للمرجع الذاتي). */
function parentsFirst(rows: Row[], pk: string, selfFields: string[]): Row[] {
  if (!selfFields.length) return rows;
  const byId = new Map(rows.map((r) => [r[pk] as string, r]));
  const state = new Map<string, number>();
  const out: Row[] = [];
  const visit = (r: Row) => {
    const id = r[pk] as string;
    if (state.get(id)) return;
    state.set(id, 1);
    for (const f of selfFields) {
      const p = r[f] as string | null;
      if (p && byId.has(p) && state.get(p) !== 1) visit(byId.get(p)!);
    }
    state.set(id, 2);
    out.push(r);
  };
  rows.forEach(visit);
  return out;
}

const endpointOf = (url: string) => new URL(url).hostname.split(".")[0].replace(/-pooler$/, "");
const describeTarget = (url: string) => {
  const u = new URL(url);
  return `${u.hostname}${u.pathname}`;
};

const LABEL_FIELDS = ["title", "name", "fileName", "message", "email", "key"];
const labelOf = (m: DModel, r: Row) => {
  const f = LABEL_FIELDS.find((x) => m.fields.some((y) => y.name === x && y.type === "String" && !y.isList));
  return f && r[f] ? String(r[f]).slice(0, 50) : String(r[pkOf(m)]).slice(0, 12);
};

function pickFile(): string {
  const f = opt("file") ?? positional;
  if (f) {
    if (!fs.existsSync(f)) throw new Error(`الملفّ غير موجود: ${f}`);
    return f;
  }
  const dir = process.env.BACKUP_DIR || path.join(os.homedir(), "bac-backups");
  const latest = fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => FILE_RE.test(x)).sort().pop() : undefined;
  if (!latest) throw new Error(`لا توجد نسخ في ${dir} — حدّد --file=`);
  return path.join(dir, latest);
}

async function main() {
  const apply = flag("apply");
  const mode = opt("mode") ?? "missing";
  if (mode !== "missing" && mode !== "full") throw new Error("--mode يقبل missing أو full فقط");
  const envName = opt("target") ?? "DATABASE_URL";
  const url = process.env[envName];
  if (!url) throw new Error(`متغيّر البيئة ${envName} غير موجود`);
  const endpoint = endpointOf(url);

  const file = pickFile();
  console.log(`النسخة : ${file}`);
  const backup = await readBackup(file);
  console.log(`أُخذت  : ${backup.createdAt}  (الملفّ سليم)`);
  console.log(`الهدف  : ${describeTarget(url)}  [${envName}]  — المعرّف: ${endpoint}`);
  console.log(`الوضع  : ${mode === "missing" ? "missing (الصفوف الغائبة فقط)" : "full (قاعدة فارغة فقط)"}  ·  ${apply ? "تنفيذ فعلي" : "تجربة جافة (لا كتابة)"}\n`);

  const only = opt("tables")?.split(",").map((s) => s.trim()).filter(Boolean);
  if (only) for (const t of only) if (!byName.has(t)) throw new Error(`جدول غير معروف: ${t}`);
  const selected = new Set(only ?? models.map((m) => m.name));

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const delegate = (m: string) => (prisma as unknown as Record<string, any>)[lowerFirst(m)];

    // معرّفات الصفوف الموجودة حالياً (للجداول المختارة ولأهداف مفاتيحها الأجنبية).
    const existing = new Map<string, Set<string>>();
    const needIds = new Set<string>();
    for (const n of selected) {
      needIds.add(n);
      for (const fk of fksOf(byName.get(n)!)) needIds.add(fk.target);
    }
    for (const [key] of backup.m2m) {
      const [mn, fn] = key.split(".");
      if (selected.has(mn)) {
        needIds.add(mn);
        needIds.add(byName.get(mn)!.fields.find((f) => f.name === fn)!.type);
      }
    }
    for (const n of needIds) {
      const pk = pkOf(byName.get(n)!);
      const rows: Row[] = await delegate(n).findMany({ select: { [pk]: true } });
      existing.set(n, new Set(rows.map((r) => r[pk] as string)));
    }

    if (mode === "full") {
      const nonEmpty = [...selected].filter((n) => existing.get(n)!.size > 0);
      if (nonEmpty.length) {
        throw new Error(`--mode=full يشترط قاعدة فارغة، لكن هذه الجداول فيها بيانات: ${nonEmpty.join(", ")}. استعمل الوضع الافتراضي missing.`);
      }
    }

    // تحديد ما سيُدرَج لكل جدول.
    const known = new Map<string, Set<string>>(); // الموجود + ما سيُدرَج (للتحقّق من المفاتيح الأجنبية)
    for (const [n, s] of existing) known.set(n, new Set(s));
    const plan = new Map<string, { rows: Row[]; orphans: Row[]; present: number }>();
    for (const n of insertOrder()) {
      if (!selected.has(n)) continue;
      const m = byName.get(n)!;
      const pk = pkOf(m);
      const fks = fksOf(m);
      const selfFields = fks.filter((f) => f.target === n).map((f) => f.field);
      const all = parentsFirst(backup.rows.get(n) ?? [], pk, selfFields);
      const rows: Row[] = [];
      const orphans: Row[] = [];
      let present = 0;
      for (const r of all) {
        if (existing.get(n)!.has(r[pk] as string)) {
          present++;
          continue;
        }
        const ok = fks.every((fk) => {
          const v = r[fk.field] as string | null | undefined;
          return v == null ? !fk.required : known.get(fk.target)?.has(v) === true;
        });
        if (ok) {
          rows.push(r);
          known.get(n)!.add(r[pk] as string);
        } else orphans.push(r);
      }
      plan.set(n, { rows, orphans, present });
    }

    // علاقات متعدّد-لمتعدّد: أزواج يخصّ أحد طرفيها صفاً سيُدرَج الآن.
    const insertedIds = (n: string) => new Set((plan.get(n)?.rows ?? []).map((r) => r[pkOf(byName.get(n)!)] as string));
    const m2mPlan: { model: string; field: string; groups: Map<string, string[]> }[] = [];
    for (const [key, pairs] of backup.m2m) {
      const [mn, fn] = key.split(".");
      if (!selected.has(mn) && !selected.has(byName.get(mn)!.fields.find((f) => f.name === fn)!.type)) continue;
      const target = byName.get(mn)!.fields.find((f) => f.name === fn)!.type;
      const insA = insertedIds(mn);
      const insB = insertedIds(target);
      const groups = new Map<string, string[]>();
      for (const { a, b } of pairs) {
        if (!(insA.has(a) || insB.has(b))) continue;
        if (!known.get(mn)?.has(a) || !known.get(target)?.has(b)) continue;
        if (!groups.has(a)) groups.set(a, []);
        groups.get(a)!.push(b);
      }
      if (groups.size) m2mPlan.push({ model: mn, field: fn, groups });
    }

    // التقرير.
    let total = 0;
    console.log("الجدول".padEnd(26) + "بالنسخة".padStart(8) + "موجود".padStart(8) + "سيُعاد".padStart(8) + "يتيمة".padStart(8));
    for (const [n, p] of plan) {
      const inBackup = backup.rows.get(n)?.length ?? 0;
      if (!inBackup) continue;
      total += p.rows.length;
      console.log(n.padEnd(26) + String(inBackup).padStart(8) + String(p.present).padStart(8) + String(p.rows.length).padStart(8) + String(p.orphans.length).padStart(8));
      if (p.rows.length && p.rows.length <= 400) {
        const m = byName.get(n)!;
        const sample = p.rows.slice(0, 4).map((r) => `«${labelOf(m, r)}»`).join(" ");
        console.log(`   ↳ ${sample}${p.rows.length > 4 ? " …" : ""}`);
      }
      if (p.orphans.length) console.log(`   ⚠ ${p.orphans.length} صفّاً يشير لسجلّ غير موجود (حُذف أصله) — لن يُعاد`);
    }
    const pairsTotal = m2mPlan.reduce((a, g) => a + [...g.groups.values()].reduce((x, y) => x + y.length, 0), 0);
    if (pairsTotal) console.log(`علاقات متعدّد-لمتعدّد ستُوصَل: ${pairsTotal}`);
    console.log(`\nالمجموع الذي سيُعاد: ${total} صفّاً`);
    if (mode === "missing" && total) {
      console.log("تنبيه: الوضع missing يعيد كل صفّ غاب عن القاعدة منذ أخذ النسخة — حتى ما حُذف عمداً بعدها. راجع القائمة أعلاه.");
    }

    if (!apply) {
      console.log(`\nهذه تجربة جافة ولم يُكتب شيء. للتنفيذ:\n  npm run db:restore -- ${[
        file !== undefined && (opt("file") || positional) ? `--file="${file}"` : "",
        only ? `--tables=${only.join(",")}` : "",
        mode === "full" ? "--mode=full" : "",
        opt("target") ? `--target=${envName}` : "",
        `--apply --confirm=${endpoint}`,
      ].filter(Boolean).join(" ")}`);
      return;
    }

    // ---- التنفيذ الفعلي ----
    if (opt("confirm") !== endpoint) {
      throw new Error(`رُفض التنفيذ: أضف --confirm=${endpoint} (معرّف خادم الهدف) لتأكيد أنك تقصد هذه القاعدة.`);
    }
    if (!total && !pairsTotal) {
      console.log("لا شيء يحتاج استرجاعاً.");
      return;
    }

    if (!flag("skip-pre-backup")) {
      console.log("\nنسخة أمان قبل التنفيذ …");
      // `--dev` = «انسخ DATABASE_URL كما هو» (وإلا اختار النسخ PROD_DATABASE_URL فتُنسَخ قاعدة غير الهدف!).
      const r = spawnSync("npx", ["tsx", "scripts/db-backup.ts", "--dev"], {
        stdio: "inherit",
        shell: true,
        env: { ...process.env, DATABASE_URL: url, BACKUP_KEEP: "9999" },
      });
      if (r.status !== 0) throw new Error("فشلت نسخة الأمان — أُلغي الاسترجاع ولم يُكتب شيء.");
    }

    console.log("\nجارٍ الاسترجاع (معاملة واحدة) …");
    const created = new Map<string, number>();
    await prisma.$transaction(
      async (tx) => {
        const d = (m: string) => (tx as unknown as Record<string, any>)[lowerFirst(m)];
        for (const [n, p] of plan) {
          if (!p.rows.length) continue;
          const m = byName.get(n)!;
          const nullableJson = m.fields.filter((f) => f.type === "Json" && !f.isRequired).map((f) => f.name);
          const take = m.fields.some((f) => f.type === "Bytes") ? 5 : 300;
          let count = 0;
          for (let i = 0; i < p.rows.length; i += take) {
            const data = p.rows.slice(i, i + take).map((r) => {
              const o: Row = { ...r };
              for (const jf of nullableJson) if (o[jf] === null) o[jf] = Prisma.DbNull;
              return o;
            });
            const res = await d(n).createMany({ data, ...(mode === "missing" ? { skipDuplicates: true } : {}) });
            count += res.count;
          }
          created.set(n, count);
        }
        for (const g of m2mPlan) {
          for (const [a, bs] of g.groups) {
            await d(g.model).update({ where: { id: a }, data: { [g.field]: { connect: bs.map((id) => ({ id })) } } });
          }
        }
      },
      { timeout: 10 * 60 * 1000, maxWait: 30_000 }
    );

    // التحقّق بعد الإتمام: كل ما قصدنا إدراجه صار موجوداً فعلاً.
    let bad = 0;
    for (const [n, p] of plan) {
      if (!p.rows.length) continue;
      const pk = pkOf(byName.get(n)!);
      const ids = p.rows.map((r) => r[pk] as string);
      let found = 0;
      for (let i = 0; i < ids.length; i += 1000) {
        found += await delegate(n).count({ where: { [pk]: { in: ids.slice(i, i + 1000) } } });
      }
      const ok = found === ids.length;
      if (!ok) bad++;
      console.log(`${ok ? "✔" : "⚠"} ${n}: أُعيد ${created.get(n)} من ${ids.length}${ok ? "" : ` (الموجود فعلاً ${found} — تعارض في قيد فريد؟)`}`);
    }
    if (pairsTotal) console.log(`✔ وُصلت ${pairsTotal} علاقة متعدّد-لمتعدّد`);
    console.log(bad ? "\n⚠ انتهى مع تحذيرات — راجع ما سبق." : "\n✔ تمّ الاسترجاع والتحقّق منه.");
    if (bad) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("✘ فشل الاسترجاع:", e instanceof Error ? e.message : e);
  process.exit(1);
});
