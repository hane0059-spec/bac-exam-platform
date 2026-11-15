// حارس آلي: كل نوع إشعار يُنشأ في الكود يجب أن يكون له عنوان دفع عامّ في PUSH_BODY_BY_TYPE
// (وإلا يصل الهاتف بالنصّ العامّ «لديك إشعار جديد» فتضيع فائدة الإشعار). يفحص الملفّات التي تستدعي
// createNotification(s) أو notifyParentsOf ويجمع قيم `type: "…"` الحرفية فيها.
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { PUSH_BODY_BY_TYPE } from "./pushPayload";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("أنواع الإشعارات", () => {
  it("لكل نوع مُنشَأ عنوان دفع في PUSH_BODY_BY_TYPE", () => {
    const missing: string[] = [];
    let seen = 0;
    for (const file of walk(path.join(__dirname, ".."))) {
      const src = fs.readFileSync(file, "utf8");
      if (!/createNotifications?\(|notifyParentsOf\(/.test(src)) continue;
      for (const m of src.matchAll(/\btype:\s*["']([A-Za-z_]+)["']/g)) {
        seen++;
        if (!PUSH_BODY_BY_TYPE[m[1]]) missing.push(`${path.relative(path.join(__dirname, ".."), file)}: ${m[1]}`);
      }
    }
    expect(seen).toBeGreaterThan(20); // الفحص فعلاً يلتقط الأنواع (لا يمرّ فارغاً)
    expect(missing).toEqual([]);
  });

  it("عناوين الدفع بلا أرقام أو قوالب (تظهر على شاشة القفل)", () => {
    for (const [type, body] of Object.entries(PUSH_BODY_BY_TYPE)) {
      expect(body, type).not.toMatch(/\d|\$\{|%/);
    }
  });
});
