import { describe, expect, it } from "vitest";
import { ACTIVITY_RANGES, DEFAULT_ACTIVITY_RANGE, parseActivityRange } from "@/lib/activityRange";

describe("parseActivityRange", () => {
  it("يعيد الفترة المطلوبة", () => {
    expect(parseActivityRange("7d").key).toBe("7d");
    expect(parseActivityRange(["30d", "7d"]).key).toBe("30d");
  });
  it("قيمة مجهولة أو غائبة ← الافتراضي", () => {
    expect(parseActivityRange("x").key).toBe(DEFAULT_ACTIVITY_RANGE);
    expect(parseActivityRange(undefined).key).toBe(DEFAULT_ACTIVITY_RANGE);
  });
  it("الفترات مرتّبة تصاعدياً", () => {
    const ms = ACTIVITY_RANGES.map((r) => r.ms);
    expect([...ms].sort((a, b) => a - b)).toEqual(ms);
  });
});
