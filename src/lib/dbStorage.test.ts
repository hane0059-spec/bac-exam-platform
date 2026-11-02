import { describe, expect, it } from "vitest";
import { dbLimitBytes, storageLevel, usagePercent, DEFAULT_DB_LIMIT_MB } from "@/lib/dbStorage";

const MB = 1024 * 1024;

describe("storageLevel", () => {
  const limit = 512 * MB;
  it("أقلّ من 70% ← ok", () => expect(storageLevel(300 * MB, limit)).toBe("ok"));
  it("70% فأكثر ← warn", () => expect(storageLevel(Math.ceil(0.7 * limit), limit)).toBe("warn"));
  it("90% فأكثر ← critical", () => {
    expect(storageLevel(Math.ceil(0.9 * limit), limit)).toBe("critical");
    expect(storageLevel(limit * 2, limit)).toBe("critical");
  });
  it("حدّ غير صالح ← ok", () => expect(storageLevel(10, 0)).toBe("ok"));
});

describe("usagePercent / dbLimitBytes", () => {
  it("النسبة مقرّبة ومقيّدة بـ100", () => {
    expect(usagePercent(256 * MB, 512 * MB)).toBe(50);
    expect(usagePercent(900 * MB, 512 * MB)).toBe(100);
  });
  it("الحدّ الافتراضي 512MB، ويُقبل ضبطه من المتغيّر إن كان معقولاً", () => {
    expect(dbLimitBytes(undefined)).toBe(DEFAULT_DB_LIMIT_MB * MB);
    expect(dbLimitBytes("not-a-number")).toBe(DEFAULT_DB_LIMIT_MB * MB);
    expect(dbLimitBytes("5")).toBe(DEFAULT_DB_LIMIT_MB * MB); // أقلّ من 20 ← يُهمَل
    expect(dbLimitBytes("10240")).toBe(10240 * MB);
  });
});
