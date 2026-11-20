import { describe, it, expect } from "vitest";
import { isStalePartFile, isTransientDbError, retryDelayMs, STALE_PART_MINUTES } from "./backupResilience";

const NOW = Date.UTC(2026, 10, 20, 12, 0, 0);
const MIN = 60 * 1000;

describe("تنظيف أجزاء النسخ المهجورة", () => {
  const part = "bac-backup-2026-11-16_2149.ndjson.gz.part";

  it("يحذف الجزء القديم فقط", () => {
    expect(isStalePartFile(part, NOW - (STALE_PART_MINUTES + 1) * MIN, NOW)).toBe(true);
    expect(isStalePartFile(part, NOW - 5 * MIN, NOW)).toBe(false); // نسخة جارية الآن
    expect(isStalePartFile(part, NOW - STALE_PART_MINUTES * MIN, NOW)).toBe(true); // الحدّ نفسه
  });

  it("لا يمسّ إلا الاسم الصارم", () => {
    const old = NOW - 24 * 60 * MIN;
    expect(isStalePartFile("bac-backup-2026-11-08_1613.ndjson.gz", old, NOW)).toBe(false); // نسخة كاملة
    expect(isStalePartFile("backup-log.txt", old, NOW)).toBe(false);
    expect(isStalePartFile("notes.part", old, NOW)).toBe(false);
    expect(isStalePartFile("x/bac-backup-2026-11-16_2149.ndjson.gz.part", old, NOW)).toBe(false);
    expect(isStalePartFile("bac-backup-2026-11-16_2149.ndjson.gz.part.bak", old, NOW)).toBe(false);
  });
});

describe("أخطاء الاتصال العابرة", () => {
  it("تُعاد المحاولة لأخطاء الشبكة والاتصال", () => {
    expect(isTransientDbError(Object.assign(new Error("x"), { code: "P1001" }))).toBe(true);
    expect(isTransientDbError(new Error("Can't reach database server at `ep-x.neon.tech:5432`"))).toBe(true);
    expect(isTransientDbError(new Error("Timed out fetching a new connection from the connection pool"))).toBe(true);
    expect(isTransientDbError(new Error("read ECONNRESET"))).toBe(true);
    expect(isTransientDbError(new Error("Connection terminated unexpectedly"))).toBe(true);
  });

  it("لا تُعاد لأخطاء دائمة", () => {
    expect(isTransientDbError(new Error("عميل Prisma قديم: في القاعدة جداول لا يعرفها"))).toBe(false);
    expect(isTransientDbError(new Error("DATABASE_URL غير موجود في .env"))).toBe(false);
    expect(isTransientDbError(Object.assign(new Error("Unique constraint"), { code: "P2002" }))).toBe(false);
    expect(isTransientDbError(null)).toBe(false);
    expect(isTransientDbError("نصّ")).toBe(false);
  });

  it("مهل الانتظار تصاعدية ومحدودة", () => {
    expect(retryDelayMs(1)).toBe(30_000);
    expect(retryDelayMs(2)).toBe(90_000);
    expect(retryDelayMs(3)).toBe(180_000);
    expect(retryDelayMs(9)).toBe(180_000);
    expect(retryDelayMs(0)).toBe(30_000);
  });
});
