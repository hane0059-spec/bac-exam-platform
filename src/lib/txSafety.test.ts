// حارس آلي (حادثة 2026-10-29): داخل معاملة تفاعلية أو قفل استشاري يجب استعمال عميل المعاملة `tx` فقط.
// المعاملة تحتجز الاتصال، وعلى Vercel connection_limit=1، فأيّ استدعاء لـ`prisma` العامّ داخلها يُعلَّق حتى المهلة (500).
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

/** أجسام الدوال الممرَّرة لمعاملة تفاعلية/قفل: من فتح القوس `{` بعد `async (tx) =>` حتى إغلاقه. */
export function interactiveCallbacks(source: string): { line: number; body: string }[] {
  const re =
    /(\$transaction\(\s*async\s*\(tx\)\s*=>|withAdvisoryLock\([^,]+,\s*async\s*\(tx\)\s*=>|withStudentCreateLock\(\s*async\s*\(tx\)\s*=>)\s*\{/g;
  const out: { line: number; body: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let i = m.index + m[0].length;
    let depth = 1;
    while (i < source.length && depth > 0) {
      const c = source[i++];
      if (c === "{") depth++;
      else if (c === "}") depth--;
    }
    out.push({
      line: source.slice(0, m.index).split("\n").length,
      body: source.slice(m.index + m[0].length, i),
    });
  }
  return out;
}

describe("سلامة المعاملات التفاعلية (connection_limit=1)", () => {
  it("الكاشف يلتقط الاستعمال الخاطئ ويتجاهل الصحيح", () => {
    const bad = `await prisma.$transaction(async (tx) => {\n  await prisma.user.findMany();\n});`;
    const good = `await prisma.$transaction(async (tx) => {\n  await tx.user.findMany();\n});`;
    const hit = (s: string) => interactiveCallbacks(s).some((c) => /\bprisma\./.test(c.body));
    expect(hit(bad)).toBe(true);
    expect(hit(good)).toBe(false);
    expect(interactiveCallbacks(`withAdvisoryLock("k", async (tx) => { await x(tx); })`)).toHaveLength(1);
  });

  it("لا استعمال مباشر لعميل Prisma العامّ داخل أيّ معاملة تفاعلية أو قفل في المشروع", () => {
    const offenders: string[] = [];
    let scanned = 0;
    for (const file of walk(path.join(process.cwd(), "src"))) {
      const src = fs.readFileSync(file, "utf8");
      for (const cb of interactiveCallbacks(src)) {
        scanned++;
        if (/\bprisma\./.test(cb.body)) {
          offenders.push(`${path.relative(process.cwd(), file)}:${cb.line}`);
        }
      }
    }
    expect(scanned).toBeGreaterThan(5); // الفحص يعمل فعلاً (لا ينجح لأنه لم يجد شيئاً)
    expect(offenders).toEqual([]);
  });
});
