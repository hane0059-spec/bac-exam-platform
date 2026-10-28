// scripts/db-push-prod.mjs
// تطبيق مخطط Prisma على قاعدة **الإنتاج** عمداً (PROD_DATABASE_URL من .env)، بتأكيد صريح.
// الاستخدام (عند إصدار تغيير مخطط جُرِّب على dev أولاً):
//   npm run db:push:prod                         ← يطبع معرّف الخادم المطلوب تأكيده
//   npm run db:push:prod -- --confirm=<المعرّف>  ← ينفّذ prisma db push على الإنتاج
import fs from "node:fs";
import { spawnSync } from "node:child_process";

if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
  }
}

const url = process.env.PROD_DATABASE_URL;
if (!url) {
  console.error("✘ PROD_DATABASE_URL غير موجود في .env (رابط قاعدة الإنتاج).");
  process.exit(1);
}
const id = new URL(url).hostname.split(".")[0].replace(/-pooler$/, "");
const confirm = process.argv.find((a) => a.startsWith("--confirm="))?.slice("--confirm=".length);
if (confirm !== id) {
  console.log(`الهدف: قاعدة الإنتاج (${id}).`);
  console.log(`للتنفيذ: npm run db:push:prod -- --confirm=${id}`);
  process.exit(confirm === undefined ? 0 : 1);
}

console.log(`تطبيق المخطط على الإنتاج (${id}) …`);
const r = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, DATABASE_URL: url },
});
process.exit(r.status ?? 1);
